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
import { randomUUID } from 'node:crypto';
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
import { CreditLedgerService } from '../credit-ledger';
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

interface ChatInvocationBaseOptions {
  model: Parameters<typeof generateText>[0]['model'];
  messages: ModelMessage[];
  tools?: ReturnType<typeof ToolConverter.convertTools>;
  toolChoice?: ReturnType<typeof ToolConverter.convertToolChoice>;
  temperature?: ChatCompletionRequest['temperature'];
  maxOutputTokens?: number;
  topP?: ChatCompletionRequest['top_p'];
  frequencyPenalty?: ChatCompletionRequest['frequency_penalty'];
  presencePenalty?: ChatCompletionRequest['presence_penalty'];
  stopSequences?: string[];
  providerOptions?: ProviderOptions;
}

type UsageResolution = {
  usage: InternalTokenUsage;
  missing: boolean;
};

@Injectable()
export class AiProxyService implements OnModuleInit {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly sseStreamBuilder = new SSEStreamBuilder();

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly creditLedgerService: CreditLedgerService,
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

    const baseOptions = this.buildChatInvocationBaseOptions(
      request,
      modelConfig,
      providerConfig,
      maxOutputTokens,
    );
    const settlementContext = this.createAiSettlementContext(
      'chat',
      userId,
      request.model,
      modelConfig,
      providerConfig,
    );

    const choiceCount = this.resolveChoiceCount(userTier, request, false);
    const results = await this.generateChoices(baseOptions, choiceCount);

    // 7. 提取 usage 并扣除积分
    const usageResolution = this.mergeUsage(
      results.map((result) => this.extractUsage(result.usage)),
    );
    const { usage } = usageResolution;
    const settlement = await this.settleAiChatUsage({
      userId,
      usage,
      usageMissing: usageResolution.missing,
      context: settlementContext,
    });

    // 8. 记录活动日志
    const duration = Date.now() - startTime;
    await this.logAiChatActivity(
      userId,
      request.model,
      usage,
      settlementContext,
      settlement,
      duration,
    );

    this.logger.debug(
      `Chat completion done: model=${request.model}, tokens=${usage.totalTokens}, credits=${settlementContext.computedCredits(usage)}, duration=${duration}ms`,
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

    const baseOptions = this.buildChatInvocationBaseOptions(
      request,
      modelConfig,
      providerConfig,
      maxOutputTokens,
    );
    const settlementContext = this.createAiSettlementContext(
      'chat',
      userId,
      request.model,
      modelConfig,
      providerConfig,
    );

    // 7. 转换格式并调用 AI SDK
    // 类型断言：我们的 AISDKMessage 格式在运行时与 ModelMessage 兼容
    const streamResult = streamText({
      ...baseOptions,
      abortSignal,
    });

    // 8. 创建 SSE 流
    return this.sseStreamBuilder.createStream(streamResult, request.model, {
      onUsage: async ({ usage, missing }) => {
        const settlement = await this.settleAiChatUsage({
          userId,
          usage,
          usageMissing: missing,
          context: settlementContext,
        });
        await this.logAiChatActivity(
          userId,
          request.model,
          usage,
          settlementContext,
          settlement,
          Date.now() - startTime,
        );
      },
      onUsageError: (error) => {
        this.logger.error(
          `Chat usage settlement callback failed: model=${request.model}, userId=${userId}`,
          error instanceof Error ? error.stack : undefined,
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

  private calculateCostUsd(
    usage: InternalTokenUsage,
    inputPrice: number,
    outputPrice: number,
  ): number {
    const inputCost = (usage.promptTokens / 1_000_000) * inputPrice;
    const outputCost = (usage.completionTokens / 1_000_000) * outputPrice;
    return inputCost + outputCost;
  }

  private createAiSettlementContext(
    kind: 'chat' | 'image',
    userId: string,
    requestModel: string,
    model: AiModel,
    provider: AiProvider,
  ) {
    const canonicalModelId = buildProviderModelRef(
      provider.providerType,
      model.modelId,
    );
    const idempotencyKey = `${kind}:${userId}:${randomUUID()}`;

    return {
      idempotencyKey,
      summary:
        kind === 'chat'
          ? `AI chat via ${canonicalModelId}`
          : `AI image via ${canonicalModelId}`,
      requestModel,
      modelId: canonicalModelId,
      providerId: provider.providerType,
      inputPriceSnapshot: model.inputTokenPrice,
      outputPriceSnapshot: model.outputTokenPrice,
      creditsPerDollarSnapshot: CREDITS_PER_DOLLAR,
      profitMultiplierSnapshot: PROFIT_MULTIPLIER,
      computedCredits: (usage: InternalTokenUsage) =>
        this.calculateCredits(
          usage,
          model.inputTokenPrice,
          model.outputTokenPrice,
        ),
      costUsd: (usage: InternalTokenUsage) =>
        this.calculateCostUsd(
          usage,
          model.inputTokenPrice,
          model.outputTokenPrice,
        ),
    };
  }

  private async settleAiChatUsage(params: {
    userId: string;
    usage: InternalTokenUsage;
    usageMissing?: boolean;
    context: ReturnType<
      typeof AiProxyService.prototype.createAiSettlementContext
    >;
  }) {
    const ledgerInput = {
      userId: params.userId,
      summary: params.context.summary,
      idempotencyKey: params.context.idempotencyKey,
      usageMissing: params.usageMissing,
      modelId: params.context.modelId,
      providerId: params.context.providerId,
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
      totalTokens: params.usage.totalTokens,
      inputPriceSnapshot: params.context.inputPriceSnapshot,
      outputPriceSnapshot: params.context.outputPriceSnapshot,
      creditsPerDollarSnapshot: params.context.creditsPerDollarSnapshot,
      profitMultiplierSnapshot: params.context.profitMultiplierSnapshot,
      costUsd: params.context.costUsd(params.usage),
      computedCredits: params.context.computedCredits(params.usage),
      detailsJson: {
        requestModel: params.context.requestModel,
      },
    } as const;

    try {
      return await this.creditLedgerService.recordAiChatSettlement(ledgerInput);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'AI settlement failed';
      this.logger.error(
        `AI chat settlement failed: userId=${params.userId}, model=${params.context.modelId}, error=${errorMessage}`,
      );

      try {
        return await this.creditLedgerService.recordAiSettlementFailure({
          ...ledgerInput,
          idempotencyKey: `${ledgerInput.idempotencyKey}:failed`,
          eventType: 'AI_CHAT',
          errorMessage,
        });
      } catch (failureError) {
        this.logger.error(
          `Failed to persist AI chat settlement failure: userId=${params.userId}, model=${params.context.modelId}`,
          failureError instanceof Error ? failureError.stack : undefined,
        );
        return null;
      }
    }
  }

  private async logAiChatActivity(
    userId: string,
    requestModel: string,
    usage: InternalTokenUsage,
    context: ReturnType<
      typeof AiProxyService.prototype.createAiSettlementContext
    >,
    settlement: Awaited<ReturnType<AiProxyService['settleAiChatUsage']>>,
    duration: number,
  ): Promise<void> {
    await this.activityLogService.logAiChat(
      userId,
      {
        model: requestModel,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        creditsConsumed: context.computedCredits(usage),
        ledgerEntryId: settlement?.id,
        ledgerStatus: settlement?.status ?? 'FAILED',
        anomalyCode:
          settlement === null ? 'SETTLEMENT_FAILED' : (settlement.anomalyCode ?? null),
        ledgerSummary: context.summary,
      },
      duration,
    );
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
  private extractUsage(sdkUsage?: {
    inputTokens?: number;
    outputTokens?: number;
  }): UsageResolution {
    const missing =
      !sdkUsage ||
      (sdkUsage.inputTokens === undefined &&
        sdkUsage.outputTokens === undefined);
    const promptTokens = sdkUsage?.inputTokens || 0;
    const completionTokens = sdkUsage?.outputTokens || 0;
    return {
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      missing,
    };
  }

  /**
   * 合并 usage
   */
  private mergeUsage(usages: UsageResolution[]): UsageResolution {
    return usages.reduce<UsageResolution>(
      (acc, item) => ({
        usage: {
          promptTokens: acc.usage.promptTokens + item.usage.promptTokens,
          completionTokens:
            acc.usage.completionTokens + item.usage.completionTokens,
          totalTokens: acc.usage.totalTokens + item.usage.totalTokens,
        },
        missing: acc.missing || item.missing,
      }),
      {
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        missing: false,
      },
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
      openaiCompatible: { user },
      openrouter: { user },
    };

    return providerOptions;
  }

  private buildChatInvocationBaseOptions(
    request: ChatCompletionRequest,
    modelConfig: AiModel,
    providerConfig: AiProvider,
    maxOutputTokens: number | undefined,
  ): ChatInvocationBaseOptions {
    const reasoning = this.resolveReasoningConfig(
      modelConfig,
      providerConfig,
      request.thinking,
    );
    const languageModel = ModelProviderFactory.create(
      providerConfig,
      modelConfig,
      reasoning,
    );
    const providerOptions = this.mergeProviderOptions(
      languageModel.providerOptions as ProviderOptions | undefined,
      this.buildProviderOptions(request.user),
    );

    return {
      model: languageModel.model,
      messages: MessageConverter.convert(request.messages) as ModelMessage[],
      tools: ToolConverter.convertTools(request.tools),
      toolChoice: ToolConverter.convertToolChoice(request.tool_choice),
      temperature: request.temperature,
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
      topP: request.top_p,
      frequencyPenalty: request.frequency_penalty,
      presencePenalty: request.presence_penalty,
      stopSequences: this.resolveStopSequences(request.stop),
      ...(providerOptions ? { providerOptions } : {}),
    };
  }

  private mergeProviderOptions(
    ...sources: Array<ProviderOptions | undefined>
  ): ProviderOptions | undefined {
    const merged: Record<string, unknown> = {};

    for (const source of sources) {
      if (!source) {
        continue;
      }
      for (const [key, value] of Object.entries(source)) {
        if (isRecord(value) && isRecord(merged[key])) {
          merged[key] = {
            ...(merged[key] as Record<string, unknown>),
            ...value,
          };
          continue;
        }
        merged[key] = value;
      }
    }

    return Object.keys(merged).length > 0
      ? (merged as ProviderOptions)
      : undefined;
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
