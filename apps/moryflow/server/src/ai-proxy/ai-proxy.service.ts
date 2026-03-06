/**
 * [INPUT]: (ChatCompletionRequest, userId, userTier) - OpenAI 格式请求与用户信息
 * [OUTPUT]: (SSE Stream | ChatCompletionResponse) - 流式或非流式 AI 响应
 * [POS]: AI 代理核心服务，模型验证、权限检查、积分扣除/欠费记录、choice 限制、provider 参数透传、多 Provider 路由
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  buildThinkingProfileFromCapabilities,
  buildProviderModelRef,
  parseProviderModelRef,
  resolveReasoningFromThinkingSelection,
  ThinkingContractError,
} from '@moryflow/model-bank';
import { streamText, generateText, type ModelMessage } from 'ai';
import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import { ActivityLogService } from '../activity-log';
import { TIER_ORDER, CREDITS_PER_DOLLAR, PROFIT_MULTIPLIER } from '../config';
import type { AiModel, AiProvider } from '../../generated/prisma/client';

// DTO
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChoice,
  ModelInfo,
  InternalTokenUsage,
  MessageResponse,
  SubscriptionTier,
  ThinkingSelection,
} from './dto';

// 模块
import { MessageConverter, ToolConverter } from './converters';
import { ModelProviderFactory, type ReasoningOptions } from './providers';
import { SSEStreamBuilder } from './stream';
import {
  ModelNotFoundException,
  InsufficientModelPermissionException,
  InsufficientCreditsException,
  OutstandingDebtException,
  InvalidRequestException,
} from './exceptions';

const MAX_CHOICE_COUNT_BY_TIER: Record<SubscriptionTier, number> = {
  free: 1,
  starter: 1,
  basic: 2,
  pro: 4,
};
const MAX_PARALLEL_CHOICES = 2;

@Injectable()
export class AiProxyService implements OnModuleInit {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly sseStreamBuilder = new SSEStreamBuilder();

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.assertModelsThinkingProfileContract();
  }

  // ==================== 公共 API ====================

  /**
   * 代理 Chat Completions 请求（非流式）
   */
  async proxyChatCompletion(
    userId: string,
    userTier: SubscriptionTier,
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const startTime = Date.now();
    this.logger.debug(
      `Chat completion request: model=${request.model}, userId=${userId}`,
    );

    // 1. 获取并验证模型
    const { model: modelConfig, provider: providerConfig } =
      await this.getAndValidateModel(userTier, request.model);

    // 2. 预检积分余额
    await this.checkCreditsBalance(userId);

    // 3. 计算最大输出 tokens
    const maxOutputTokens = this.resolveMaxOutputTokens(request, modelConfig);

    // 4. 解析 reasoning 配置（模型默认配置 + 请求覆盖）
    const reasoning = this.resolveReasoningConfig(
      modelConfig,
      providerConfig,
      request.thinking,
    );

    // 5. 创建模型实例（传递 reasoning 配置）
    const languageModel = ModelProviderFactory.create(
      providerConfig,
      modelConfig,
      reasoning,
    );

    const messages = MessageConverter.convert(
      request.messages,
    ) as ModelMessage[];
    const tools = ToolConverter.convertTools(request.tools);
    const toolChoice = ToolConverter.convertToolChoice(request.tool_choice);
    const stopSequences = this.resolveStopSequences(request.stop);
    const providerOptions = this.buildProviderOptions(request.user);

    const baseOptions = {
      model: languageModel,
      messages,
      tools,
      toolChoice,
      temperature: request.temperature,
      maxOutputTokens,
      topP: request.top_p,
      frequencyPenalty: request.frequency_penalty,
      presencePenalty: request.presence_penalty,
      stopSequences,
      ...(providerOptions && { providerOptions }),
    };

    const choiceCount = this.resolveChoiceCount(userTier, request, false);
    const results = await this.generateChoices(baseOptions, choiceCount);

    // 7. 提取 usage 并扣除积分
    const usages = results.map((result) => this.extractUsage(result.usage));
    const usage = this.mergeUsage(usages);
    const settlement = await this.consumeCredits(userId, usage, modelConfig);
    const credits = settlement.consumed + settlement.debtIncurred;

    // 8. 记录活动日志
    const duration = Date.now() - startTime;
    await this.activityLogService.logAiChat(
      userId,
      {
        model: request.model,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        creditsConsumed: credits,
      },
      duration,
    );

    this.logger.debug(
      `Chat completion done: model=${request.model}, tokens=${usage.totalTokens}, credits=${credits}, duration=${duration}ms`,
    );

    // 9. 构建响应
    const choices = results.map((result, index) =>
      this.buildCompletionChoice(result, index),
    );

    return this.buildCompletionResponse(request.model, choices, usage);
  }

  /**
   * 代理 Chat Completions 请求（流式）
   */
  async proxyChatCompletionStream(
    userId: string,
    userTier: SubscriptionTier,
    request: ChatCompletionRequest,
    abortSignal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> {
    const startTime = Date.now();
    this.logger.debug(
      `Stream request: model=${request.model}, userId=${userId}`,
    );

    // 1. 获取并验证模型
    const { model: modelConfig, provider: providerConfig } =
      await this.getAndValidateModel(userTier, request.model);

    // 2. 预检积分余额
    await this.checkCreditsBalance(userId);

    // 3. 验证生成选项
    this.resolveChoiceCount(userTier, request, true);

    // 4. 计算最大输出 tokens
    const maxOutputTokens = this.resolveMaxOutputTokens(request, modelConfig);

    // 5. 解析 reasoning 配置（模型默认配置 + 请求覆盖）
    const reasoning = this.resolveReasoningConfig(
      modelConfig,
      providerConfig,
      request.thinking,
    );

    // 6. 创建模型实例（传递 reasoning 配置）
    const languageModel = ModelProviderFactory.create(
      providerConfig,
      modelConfig,
      reasoning,
    );

    const messages = MessageConverter.convert(
      request.messages,
    ) as ModelMessage[];
    const tools = ToolConverter.convertTools(request.tools);
    const toolChoice = ToolConverter.convertToolChoice(request.tool_choice);
    const stopSequences = this.resolveStopSequences(request.stop);
    const providerOptions = this.buildProviderOptions(request.user);

    // 7. 转换格式并调用 AI SDK
    // 类型断言：我们的 AISDKMessage 格式在运行时与 ModelMessage 兼容
    const streamResult = streamText({
      model: languageModel,
      messages,
      tools,
      toolChoice,
      temperature: request.temperature,
      maxOutputTokens,
      topP: request.top_p,
      frequencyPenalty: request.frequency_penalty,
      presencePenalty: request.presence_penalty,
      stopSequences,
      ...(providerOptions && { providerOptions }),
      abortSignal,
    });

    // 8. 创建 SSE 流
    return this.sseStreamBuilder.createStream(streamResult, request.model, {
      onUsage: async (usage) => {
        const settlement = await this.consumeCredits(
          userId,
          usage,
          modelConfig,
        );
        const credits = settlement.consumed + settlement.debtIncurred;
        // 记录活动日志
        await this.activityLogService.logAiChat(
          userId,
          {
            model: request.model,
            inputTokens: usage.promptTokens,
            outputTokens: usage.completionTokens,
            creditsConsumed: credits,
          },
          Date.now() - startTime,
        );
      },
      onAbort: () => {
        this.logger.debug(
          `Stream aborted: model=${request.model}, userId=${userId}`,
        );
      },
    });
  }

  /**
   * 获取所有模型列表（包含权限信息）
   */
  async getAllModelsWithAccess(
    userTier: SubscriptionTier,
  ): Promise<ModelInfo[]> {
    const userLevel = TIER_ORDER.indexOf(userTier);

    const models = await this.prisma.aiModel.findMany({
      where: { enabled: true },
      include: { provider: true },
      orderBy: [{ provider: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });

    return models
      .filter((m) => m.provider.enabled)
      .map((m) => {
        const modelLevel = TIER_ORDER.indexOf(m.minTier as SubscriptionTier);
        const canonicalModelId = buildProviderModelRef(
          m.provider.providerType,
          m.modelId,
        );
        return {
          id: canonicalModelId,
          object: 'model' as const,
          created: Math.floor(m.createdAt.getTime() / 1000),
          owned_by: m.provider.name,
          display_name: m.displayName,
          min_tier: m.minTier,
          available: userLevel >= modelLevel,
          permission: [],
          root: canonicalModelId,
          parent: null,
          thinking_profile: this.resolveThinkingProfileForModel(m),
        };
      });
  }

  // ==================== 内部方法 ====================

  /**
   * 获取并验证模型配置
   */
  private async getAndValidateModel(
    userTier: SubscriptionTier,
    modelId: string,
  ): Promise<{ model: AiModel; provider: AiProvider }> {
    const parsedModelRef = parseProviderModelRef(modelId);
    const normalizedProviderType = parsedModelRef?.providerId
      ? parsedModelRef.providerId.toLowerCase()
      : null;

    let model:
      | (AiModel & {
          provider: AiProvider;
        })
      | null = null;

    if (parsedModelRef && normalizedProviderType) {
      model = await this.prisma.aiModel.findFirst({
        where: {
          modelId: parsedModelRef.modelId,
          enabled: true,
          provider: {
            enabled: true,
            providerType: normalizedProviderType,
          },
        },
        include: { provider: true },
      });
    } else {
      model = await this.prisma.aiModel.findFirst({
        where: {
          modelId,
          enabled: true,
        },
        include: { provider: true },
      });
    }

    if (!model || !model.provider.enabled) {
      throw new ModelNotFoundException(modelId);
    }

    // 检查用户权限
    const userLevel = TIER_ORDER.indexOf(userTier);
    const modelLevel = TIER_ORDER.indexOf(model.minTier as SubscriptionTier);

    if (userLevel < modelLevel) {
      throw new InsufficientModelPermissionException(userTier, modelId);
    }

    return { model, provider: model.provider };
  }

  /**
   * 预检积分余额（欠费与余额不足都会阻断）
   */
  private async checkCreditsBalance(userId: string): Promise<void> {
    const balance = await this.creditService.getCreditsBalance(userId);
    if (balance.debt > 0) {
      throw new OutstandingDebtException(balance.debt);
    }
    if (balance.total <= 0) {
      throw new InsufficientCreditsException(1, balance.total);
    }
  }

  /**
   * 扣除积分
   * @returns 扣除的积分数
   */
  private async consumeCredits(
    userId: string,
    usage: InternalTokenUsage,
    model: AiModel,
  ): Promise<{ consumed: number; debtIncurred: number }> {
    const credits = this.calculateCredits(
      usage,
      model.inputTokenPrice,
      model.outputTokenPrice,
    );
    const settlement = await this.creditService.consumeCreditsWithDebt(
      userId,
      credits,
    );

    if (settlement.debtIncurred > 0) {
      this.logger.warn(
        `Credits debt incurred: userId=${userId}, debt=${settlement.debtIncurred}`,
      );
    }

    return {
      consumed: settlement.consumed,
      debtIncurred: settlement.debtIncurred,
    };
  }

  /**
   * 计算积分消耗（应用利润倍率）
   */
  private calculateCredits(
    usage: InternalTokenUsage,
    inputPrice: number,
    outputPrice: number,
  ): number {
    // 价格单位是 $/1M tokens
    const inputCost = (usage.promptTokens / 1_000_000) * inputPrice;
    const outputCost = (usage.completionTokens / 1_000_000) * outputPrice;
    const totalCost = inputCost + outputCost;
    // 应用利润倍率
    return Math.ceil(totalCost * CREDITS_PER_DOLLAR * PROFIT_MULTIPLIER);
  }

  /**
   * 计算最大输出 tokens
   * 仅当请求显式指定 max_tokens 时才返回值，否则让 AI SDK 使用默认值
   */
  private resolveMaxOutputTokens(
    request: ChatCompletionRequest,
    model: AiModel,
  ): number | undefined {
    // 请求未指定 max_tokens，不传递参数，让 API 使用默认值
    if (request.max_tokens === undefined || request.max_tokens === null) {
      return undefined;
    }
    // 请求指定了 max_tokens，限制不超过模型配置的最大值
    return Math.min(request.max_tokens, model.maxOutputTokens);
  }

  private resolveThinkingProfileForModel(
    model: AiModel & { provider: AiProvider },
  ): ModelInfo['thinking_profile'] {
    const profile = buildThinkingProfileFromCapabilities({
      modelId: model.modelId,
      providerId: model.provider.providerType,
      capabilitiesJson: model.capabilitiesJson,
    });
    const normalizedLevels = profile.levels.map((level) => {
      const visibleParams = this.normalizeThinkingVisibleParams(
        level.visibleParams,
      );
      return {
        id: level.id,
        label: level.label,
        ...(level.description ? { description: level.description } : {}),
        ...(visibleParams.length > 0 ? { visibleParams } : {}),
      };
    });

    return this.assertThinkingProfileContract(
      {
        supportsThinking: profile.supportsThinking,
        defaultLevel: profile.defaultLevel,
        levels: normalizedLevels,
      },
      model.modelId,
    );
  }

  private normalizeThinkingVisibleParams(
    value: unknown,
  ): NonNullable<
    ModelInfo['thinking_profile']['levels'][number]['visibleParams']
  > {
    if (!Array.isArray(value)) {
      return [];
    }

    const params: NonNullable<
      ModelInfo['thinking_profile']['levels'][number]['visibleParams']
    > = [];
    const seen = new Set<string>();

    for (const item of value) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const record = item as Record<string, unknown>;
      const key = typeof record.key === 'string' ? record.key.trim() : '';
      const normalizedValue =
        typeof record.value === 'string' ? record.value.trim() : '';
      if (!key || !normalizedValue || seen.has(key)) {
        continue;
      }
      seen.add(key);
      params.push({
        key,
        value: normalizedValue,
      });
    }

    return params;
  }

  private assertThinkingProfileContract(
    profile: ModelInfo['thinking_profile'],
    modelId: string,
  ): ModelInfo['thinking_profile'] {
    const levels = Array.isArray(profile.levels) ? profile.levels : [];
    if (levels.length === 0) {
      throw new InternalServerErrorException(
        `Model '${modelId}' missing thinking_profile.levels`,
      );
    }
    if (!levels.some((level) => level.id === 'off')) {
      throw new InternalServerErrorException(
        `Model '${modelId}' thinking_profile.levels must include 'off'`,
      );
    }
    if (!levels.some((level) => level.id === profile.defaultLevel)) {
      throw new InternalServerErrorException(
        `Model '${modelId}' thinking_profile.defaultLevel must exist in levels`,
      );
    }
    for (const level of levels) {
      if (!Array.isArray(level.visibleParams)) {
        continue;
      }
      for (const param of level.visibleParams) {
        const key = typeof param.key === 'string' ? param.key.trim() : '';
        if (!key) {
          throw new InternalServerErrorException(
            `Model '${modelId}' level '${level.id}' has invalid visibleParams key`,
          );
        }
        if (typeof param.value !== 'string' || !param.value.trim()) {
          throw new InternalServerErrorException(
            `Model '${modelId}' level '${level.id}' has empty visibleParams value`,
          );
        }
      }
    }

    return {
      supportsThinking: levels.some((level) => level.id !== 'off'),
      defaultLevel: profile.defaultLevel,
      levels,
    };
  }

  private async assertModelsThinkingProfileContract(): Promise<void> {
    const enabledModels = await this.prisma.aiModel.findMany({
      where: { enabled: true, provider: { enabled: true } },
      include: { provider: true },
    });
    for (const model of enabledModels) {
      this.resolveThinkingProfileForModel(model);
    }
  }

  /**
   * 根据模型下发的 thinking_profile + 请求 thinking 选择解析 Reasoning 配置
   */
  private resolveReasoningConfig(
    model: AiModel,
    provider: AiProvider,
    requestThinking?: ThinkingSelection,
  ): ReasoningOptions | undefined {
    if (!requestThinking) {
      return undefined;
    }

    try {
      return resolveReasoningFromThinkingSelection({
        modelId: model.modelId,
        providerId: provider.providerType,
        capabilitiesJson: model.capabilitiesJson,
        thinking: requestThinking,
      });
    } catch (error) {
      if (error instanceof ThinkingContractError) {
        throw new InvalidRequestException(error.message, error.code);
      }
      throw error;
    }
  }

  /**
   * 提取 usage
   */
  private extractUsage(sdkUsage: {
    inputTokens?: number;
    outputTokens?: number;
  }): InternalTokenUsage {
    const promptTokens = sdkUsage.inputTokens || 0;
    const completionTokens = sdkUsage.outputTokens || 0;
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  /**
   * 合并 usage
   */
  private mergeUsage(usages: InternalTokenUsage[]): InternalTokenUsage {
    return usages.reduce(
      (acc, usage) => ({
        promptTokens: acc.promptTokens + usage.promptTokens,
        completionTokens: acc.completionTokens + usage.completionTokens,
        totalTokens: acc.totalTokens + usage.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    );
  }

  /**
   * 构建单条 choice
   */
  private buildCompletionChoice(
    result: Awaited<ReturnType<typeof generateText>>,
    index: number,
  ): ChatCompletionChoice {
    const hasToolCalls = result.toolCalls && result.toolCalls.length > 0;

    // 构建 message
    const message: MessageResponse = {
      role: 'assistant',
      content: hasToolCalls ? null : result.text,
    };

    // 如果有 tool_calls，添加到响应中
    if (hasToolCalls) {
      message.tool_calls = result.toolCalls.map((tc) => ({
        id: tc.toolCallId,
        type: 'function' as const,
        function: {
          name: tc.toolName,
          // AI SDK v6 使用 input
          arguments: JSON.stringify(tc.input ?? {}),
        },
      }));
    }

    return {
      index,
      message,
      finish_reason: hasToolCalls ? 'tool_calls' : 'stop',
    };
  }

  /**
   * 构建非流式响应
   */
  private buildCompletionResponse(
    model: string,
    choices: ChatCompletionChoice[],
    usage: InternalTokenUsage,
  ): ChatCompletionResponse {
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices,
      usage: {
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        total_tokens: usage.totalTokens,
      },
    };
  }

  /**
   * 解析 stop 参数
   */
  private resolveStopSequences(stop?: string | string[]): string[] | undefined {
    if (!stop) {
      return undefined;
    }

    const sequences = Array.isArray(stop) ? stop : [stop];
    const normalized = sequences.filter((sequence) => sequence.length > 0);
    return normalized.length > 0 ? normalized : undefined;
  }

  /**
   * 透传 provider-specific options
   */
  private buildProviderOptions(user?: string): ProviderOptions | undefined {
    if (!user) {
      return undefined;
    }

    const providerOptions: ProviderOptions = {
      openai: { user },
      openrouter: { user },
    };

    return providerOptions;
  }

  private resolveChoiceCount(
    userTier: SubscriptionTier,
    request: ChatCompletionRequest,
    isStream: boolean,
  ): number {
    const requested = request.n ?? 1;
    if (!Number.isInteger(requested) || requested <= 0) {
      throw new InvalidRequestException('n must be a positive integer');
    }

    if (isStream && requested > 1) {
      throw new InvalidRequestException('n must be 1 when stream is true');
    }

    const maxAllowed = MAX_CHOICE_COUNT_BY_TIER[userTier] ?? 1;
    if (requested > maxAllowed) {
      throw new InvalidRequestException(
        `n exceeds plan limit. Max allowed: ${maxAllowed}.`,
      );
    }

    return requested;
  }

  private async generateChoices(
    baseOptions: Parameters<typeof generateText>[0],
    choiceCount: number,
  ): Promise<Awaited<ReturnType<typeof generateText>>[]> {
    if (choiceCount <= 1) {
      return [await generateText(baseOptions)];
    }

    const results: Awaited<ReturnType<typeof generateText>>[] = [];
    const batchSize = Math.min(MAX_PARALLEL_CHOICES, choiceCount);

    for (let i = 0; i < choiceCount; i += batchSize) {
      const currentCount = Math.min(batchSize, choiceCount - i);
      const batch = await Promise.all(
        Array.from({ length: currentCount }, () =>
          generateText({ ...baseOptions }),
        ),
      );
      results.push(...batch);
    }

    return results;
  }
}
