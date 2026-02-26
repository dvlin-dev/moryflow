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
  ReasoningRequest,
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

const THINKING_LEVEL_LABELS: Record<string, string> = {
  off: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  max: 'Max',
  xhigh: 'X-High',
};

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
      request.reasoning,
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
      request.reasoning,
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
    await this.assertModelsThinkingProfileContract();
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
        return {
          id: m.modelId,
          object: 'model' as const,
          created: Math.floor(m.createdAt.getTime() / 1000),
          owned_by: m.provider.name,
          display_name: m.displayName,
          min_tier: m.minTier,
          available: userLevel >= modelLevel,
          permission: [],
          root: m.modelId,
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
    const model = await this.prisma.aiModel.findFirst({
      where: { modelId, enabled: true },
      include: { provider: true },
    });

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

  private parseCapabilitiesJson(
    capabilitiesJson: unknown,
  ): Record<string, unknown> | null {
    if (!capabilitiesJson) {
      return null;
    }
    if (typeof capabilitiesJson === 'string') {
      try {
        const parsed = JSON.parse(capabilitiesJson) as Record<string, unknown>;
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
    if (typeof capabilitiesJson === 'object') {
      return capabilitiesJson as Record<string, unknown>;
    }
    return null;
  }

  private getDefaultThinkingLevelsByProviderType(
    providerType: string,
  ): string[] {
    switch (providerType) {
      case 'openrouter':
        return ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'];
      case 'anthropic':
        return ['off', 'low', 'medium', 'high', 'max'];
      case 'google':
        return ['off', 'low', 'medium', 'high'];
      case 'openai':
      case 'openai-compatible':
      case 'xai':
        return ['off', 'low', 'medium', 'high'];
      default:
        return ['off'];
    }
  }

  private resolveThinkingProfileForModel(
    model: AiModel & { provider: AiProvider },
  ): ModelInfo['thinking_profile'] {
    const capabilities = this.parseCapabilitiesJson(model.capabilitiesJson);
    const reasoning = capabilities?.reasoning as
      | Record<string, unknown>
      | undefined;

    const rawLevels = Array.isArray(reasoning?.levels)
      ? reasoning.levels
      : undefined;
    const configuredLevels = (rawLevels ?? [])
      .map((level) => {
        if (typeof level === 'string') {
          const trimmed = level.trim();
          return trimmed.length > 0
            ? { id: trimmed, label: THINKING_LEVEL_LABELS[trimmed] ?? trimmed }
            : null;
        }
        if (!level || typeof level !== 'object') {
          return null;
        }
        const id =
          typeof (level as { id?: unknown }).id === 'string'
            ? (level as { id: string }).id.trim()
            : '';
        if (!id) {
          return null;
        }
        const label =
          typeof (level as { label?: unknown }).label === 'string'
            ? (level as { label: string }).label.trim()
            : '';
        const description =
          typeof (level as { description?: unknown }).description === 'string'
            ? (level as { description: string }).description.trim()
            : '';
        return {
          id,
          label: label || THINKING_LEVEL_LABELS[id] || id,
          ...(description ? { description } : {}),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const configuredSupport =
      reasoning?.supportsThinking === true || reasoning?.enabled === true;
    const hasConfiguredThinking = configuredLevels.some(
      (level) => level.id !== 'off',
    );
    const supportsThinking = configuredSupport || hasConfiguredThinking;
    const fallbackLevels = this.getDefaultThinkingLevelsByProviderType(
      model.provider.providerType,
    );
    const effectiveLevels = supportsThinking
      ? configuredLevels.length > 0
        ? configuredLevels
        : fallbackLevels.map((id) => ({
            id,
            label: THINKING_LEVEL_LABELS[id] ?? id,
          }))
      : [{ id: 'off', label: 'Off' }];

    const uniqueLevels: typeof effectiveLevels = [];
    for (const level of effectiveLevels) {
      if (uniqueLevels.some((item) => item.id === level.id)) {
        continue;
      }
      uniqueLevels.push(level);
    }
    if (!uniqueLevels.some((item) => item.id === 'off')) {
      uniqueLevels.unshift({ id: 'off', label: 'Off' });
    }

    const requestedDefault =
      typeof reasoning?.defaultLevel === 'string'
        ? reasoning.defaultLevel.trim()
        : '';
    const defaultLevel = uniqueLevels.some(
      (level) => level.id === requestedDefault,
    )
      ? requestedDefault
      : 'off';

    return this.assertThinkingProfileContract(
      {
        supportsThinking: uniqueLevels.some((level) => level.id !== 'off'),
        defaultLevel,
        levels: uniqueLevels,
      },
      model.modelId,
    );
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
   * 解析 Reasoning 配置
   * 合并模型默认配置和请求覆盖配置
   * 优先级：请求显式禁用 > rawConfig > 请求覆盖 > 模型默认
   */
  private resolveReasoningConfig(
    model: AiModel,
    requestReasoning?: ReasoningRequest,
  ): ReasoningOptions | undefined {
    // 请求显式禁用 reasoning，优先级最高
    if (requestReasoning?.enabled === false) {
      return undefined;
    }

    // 从模型 capabilitiesJson 中获取默认 reasoning 配置
    const capabilities = this.parseCapabilitiesJson(model.capabilitiesJson);
    const modelReasoning = capabilities?.reasoning as
      | ReasoningOptions
      | undefined;

    // 如果模型没有配置 reasoning 且请求也没有启用，返回 undefined
    if (
      !modelReasoning?.enabled &&
      !modelReasoning?.rawConfig &&
      !requestReasoning?.enabled
    ) {
      return undefined;
    }

    // 如果模型配置了 rawConfig，优先使用（高级透传模式）
    if (modelReasoning?.rawConfig) {
      return {
        enabled: true,
        rawConfig: modelReasoning.rawConfig,
      };
    }

    // 合并配置：请求参数优先于模型默认配置
    return {
      enabled: requestReasoning?.enabled ?? modelReasoning?.enabled ?? false,
      effort: requestReasoning?.effort ?? modelReasoning?.effort ?? 'medium',
      maxTokens:
        requestReasoning?.max_tokens ?? modelReasoning?.maxTokens ?? undefined,
      exclude: requestReasoning?.exclude ?? modelReasoning?.exclude ?? false,
    };
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
