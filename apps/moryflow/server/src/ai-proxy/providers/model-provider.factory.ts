/**
 * 模型 Provider 工厂
 * 根据 provider 类型创建对应的 AI SDK LanguageModel 实例
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { resolveProviderSdkType } from '@moryflow/model-bank';
import type { LanguageModel } from 'ai';
import type { AiModel, AiProvider } from '../../../generated/prisma/client';
import { UnsupportedProviderException } from '../exceptions';

/** Reasoning 配置 */
export interface ReasoningOptions {
  enabled?: boolean;
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';
  maxTokens?: number;
  includeThoughts?: boolean;
  exclude?: boolean;
  /** 原生配置覆盖（高级选项，直接透传给 API） */
  rawConfig?: Record<string, unknown>;
}

/** 支持的 SDK 类型 */
export type SdkType =
  | 'openai'
  | 'openai-compatible'
  | 'openrouter'
  | 'anthropic'
  | 'google';

/** 兼容旧的 ProviderType 导出 */
export type ProviderType = SdkType;

/** Provider 配置 */
interface ProviderOptions {
  apiKey: string;
  baseURL?: string;
}

/**
 * 模型 Provider 工厂
 * 负责根据配置创建 AI SDK 的 LanguageModel 实例
 */
export class ModelProviderFactory {
  /**
   * 根据 providerType 解析对应的 sdkType（统一收敛到 model-bank）
   */
  private static getSdkType(providerType: string): SdkType {
    const resolved = resolveProviderSdkType({ providerId: providerType });
    if (resolved) return resolved as SdkType;
    // 如果找不到预设，检查是否是已知的 SDK 类型
    const knownSdkTypes: SdkType[] = [
      'openai',
      'openai-compatible',
      'openrouter',
      'anthropic',
      'google',
    ];
    if (knownSdkTypes.includes(providerType as SdkType)) {
      return providerType as SdkType;
    }
    // 未知类型抛出异常
    throw new UnsupportedProviderException(providerType);
  }

  /**
   * 创建 LanguageModel 实例
   */
  static create(
    provider: AiProvider,
    model: AiModel,
    reasoning?: ReasoningOptions,
  ): LanguageModel {
    const options: ProviderOptions = {
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl || undefined,
    };

    const sdkType = this.getSdkType(provider.providerType);

    return this.createBySdkType(sdkType, model.upstreamId, options, reasoning);
  }

  /**
   * 根据 SDK 类型创建对应的模型实例
   */
  private static createBySdkType(
    sdkType: SdkType,
    modelId: string,
    options: ProviderOptions,
    reasoning?: ReasoningOptions,
  ): LanguageModel {
    switch (sdkType) {
      case 'openai':
      case 'openai-compatible':
        return this.createOpenAICompatible(modelId, options, reasoning);

      case 'openrouter':
        return this.createOpenRouter(modelId, options, reasoning);

      case 'anthropic':
        return this.createAnthropic(modelId, options, reasoning);

      case 'google':
        return this.createGoogle(modelId, options, reasoning);

      default:
        throw new UnsupportedProviderException(sdkType);
    }
  }

  /**
   * 创建 OpenAI 兼容的模型
   * 包括 OpenAI、OneAPI 等
   */
  private static createOpenAICompatible(
    modelId: string,
    options: ProviderOptions,
    reasoning?: ReasoningOptions,
  ): LanguageModel {
    // 明确使用 .chat() 调用 Chat Completions API
    // 默认的 (modelId) 调用会使用 Responses API，第三方服务不完全支持
    const openaiFactory = createOpenAI(options) as {
      chat: (
        modelId: string,
        settings?: Record<string, unknown>,
      ) => LanguageModel;
    };
    return openaiFactory.chat(
      modelId,
      reasoning?.enabled
        ? {
            reasoningEffort: reasoning.effort ?? 'medium',
          }
        : undefined,
    );
  }

  /**
   * 创建 OpenRouter 模型（支持 reasoning）
   */
  private static createOpenRouter(
    modelId: string,
    options: ProviderOptions,
    reasoning?: ReasoningOptions,
  ): LanguageModel {
    const openrouter = createOpenRouter({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });

    // 如果有 reasoning 配置（enabled 或 rawConfig）
    if (reasoning?.enabled || reasoning?.rawConfig) {
      // 优先使用 rawConfig，否则构建通用配置
      // 注意：OpenRouter API 规定 effort 和 max_tokens 只能二选一
      const reasoningParams = reasoning.rawConfig ?? {
        reasoning: this.buildReasoningConfig(reasoning),
      };

      return openrouter.chat(modelId, {
        includeReasoning: true,
        extraBody: reasoningParams,
      }) as unknown as LanguageModel;
    }

    return openrouter.chat(modelId) as unknown as LanguageModel;
  }

  /**
   * 构建 reasoning 配置
   * OpenRouter API 规定 effort 和 max_tokens 只能二选一
   * 如果指定了 max_tokens，使用 max_tokens；否则使用 effort
   */
  private static buildReasoningConfig(
    reasoning: ReasoningOptions,
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {
      exclude: reasoning.exclude ?? false,
    };

    // max_tokens 优先级更高，如果指定了就只使用 max_tokens
    if (reasoning.maxTokens !== undefined && reasoning.maxTokens !== null) {
      config.max_tokens = reasoning.maxTokens;
    } else {
      // 否则使用 effort
      config.effort = reasoning.effort ?? 'medium';
    }

    return config;
  }

  /**
   * 创建 Anthropic 模型
   */
  private static createAnthropic(
    modelId: string,
    options: ProviderOptions,
    reasoning?: ReasoningOptions,
  ): LanguageModel {
    const anthropicFactory = createAnthropic(options) as (
      modelId: string,
      settings?: Record<string, unknown>,
    ) => LanguageModel;
    return anthropicFactory(
      modelId,
      reasoning?.enabled
        ? {
            thinking: {
              type: 'enabled',
              budgetTokens: reasoning.maxTokens ?? 12000,
            },
          }
        : undefined,
    );
  }

  /**
   * 创建 Google Generative AI 模型
   */
  private static createGoogle(
    modelId: string,
    options: ProviderOptions,
    reasoning?: ReasoningOptions,
  ): LanguageModel {
    const googleFactory = createGoogleGenerativeAI(options) as (
      modelId: string,
      settings?: Record<string, unknown>,
    ) => LanguageModel;
    return googleFactory(
      modelId,
      reasoning?.enabled
        ? {
            thinkingConfig: {
              includeThoughts: reasoning.includeThoughts ?? true,
              thinkingBudget: reasoning.maxTokens,
            },
          }
        : undefined,
    );
  }
}
