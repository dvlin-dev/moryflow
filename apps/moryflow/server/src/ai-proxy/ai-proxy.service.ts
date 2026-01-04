/**
 * [INPUT]: (ChatCompletionRequest, userId, userTier) - OpenAI 格式请求与用户信息
 * [OUTPUT]: (SSE Stream | ChatCompletionResponse) - 流式或非流式 AI 响应
 * [POS]: AI 代理核心服务，模型验证、权限检查、积分扣除、多 Provider 路由
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { streamText, generateText, type ModelMessage } from 'ai';
import { PrismaService } from '../prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import { ActivityLogService } from '../activity-log';
import { TIER_ORDER, CREDITS_PER_DOLLAR, PROFIT_MULTIPLIER } from '../config';
import type { AiModel, AiProvider } from '../../generated/prisma/client';

// DTO
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelInfo,
  InternalTokenUsage,
  MessageResponse,
  UserTier,
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
} from './exceptions';

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);
  private readonly sseStreamBuilder = new SSEStreamBuilder();

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ==================== 公共 API ====================

  /**
   * 代理 Chat Completions 请求（非流式）
   */
  async proxyChatCompletion(
    userId: string,
    userTier: UserTier,
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

    // 6. 转换格式并调用 AI SDK
    // 类型断言：我们的 AISDKMessage 格式在运行时与 ModelMessage 兼容
    const result = await generateText({
      model: languageModel,
      messages: MessageConverter.convert(request.messages) as ModelMessage[],
      tools: ToolConverter.convertTools(request.tools),
      toolChoice: ToolConverter.convertToolChoice(request.tool_choice),
      temperature: request.temperature,
      maxOutputTokens,
      topP: request.top_p,
      frequencyPenalty: request.frequency_penalty,
      presencePenalty: request.presence_penalty,
    });

    // 7. 提取 usage 并扣除积分
    const usage = this.extractUsage(result.usage);
    const credits = await this.consumeCredits(userId, usage, modelConfig);

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
    return this.buildCompletionResponse(result, request.model, usage);
  }

  /**
   * 代理 Chat Completions 请求（流式）
   */
  async proxyChatCompletionStream(
    userId: string,
    userTier: UserTier,
    request: ChatCompletionRequest,
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

    // 6. 转换格式并调用 AI SDK
    // 类型断言：我们的 AISDKMessage 格式在运行时与 ModelMessage 兼容
    const streamResult = streamText({
      model: languageModel,
      messages: MessageConverter.convert(request.messages) as ModelMessage[],
      tools: ToolConverter.convertTools(request.tools),
      toolChoice: ToolConverter.convertToolChoice(request.tool_choice),
      temperature: request.temperature,
      maxOutputTokens,
      topP: request.top_p,
      frequencyPenalty: request.frequency_penalty,
      presencePenalty: request.presence_penalty,
    });

    // 7. 创建 SSE 流
    return this.sseStreamBuilder.createStream(streamResult, request.model, {
      onUsage: async (usage) => {
        const credits = await this.consumeCredits(userId, usage, modelConfig);
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
    });
  }

  /**
   * 获取所有模型列表（包含权限信息）
   */
  async getAllModelsWithAccess(userTier: UserTier): Promise<ModelInfo[]> {
    const userLevel = TIER_ORDER.indexOf(userTier);

    const models = await this.prisma.aiModel.findMany({
      where: { enabled: true },
      include: { provider: true },
      orderBy: [{ provider: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });

    return models
      .filter((m) => m.provider.enabled)
      .map((m) => {
        const modelLevel = TIER_ORDER.indexOf(m.minTier as UserTier);
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
        };
      });
  }

  // ==================== 内部方法 ====================

  /**
   * 获取并验证模型配置
   */
  private async getAndValidateModel(
    userTier: UserTier,
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
    const modelLevel = TIER_ORDER.indexOf(model.minTier as UserTier);

    if (userLevel < modelLevel) {
      throw new InsufficientModelPermissionException(userTier, modelId);
    }

    return { model, provider: model.provider };
  }

  /**
   * 预检积分余额（仅检查是否 > 0）
   */
  private async checkCreditsBalance(userId: string): Promise<void> {
    const balance = await this.creditService.getCreditsBalance(userId);
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
  ): Promise<number> {
    const credits = this.calculateCredits(
      usage,
      model.inputTokenPrice,
      model.outputTokenPrice,
    );
    await this.creditService.consumeCredits(userId, credits);
    return credits;
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
    const capabilities = model.capabilitiesJson as Record<string, unknown>;
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
   * 构建非流式响应
   */
  private buildCompletionResponse(
    result: Awaited<ReturnType<typeof generateText>>,
    model: string,
    usage: InternalTokenUsage,
  ): ChatCompletionResponse {
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
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message,
          finish_reason: hasToolCalls ? 'tool_calls' : 'stop',
        },
      ],
      usage: {
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        total_tokens: usage.totalTokens,
      },
    };
  }
}
