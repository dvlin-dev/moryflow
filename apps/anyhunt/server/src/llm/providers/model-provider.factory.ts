/**
 * [INPUT]: Provider config（providerType/apiKey/baseUrl）+ upstreamModelId + reasoning 配置
 * [OUTPUT]: AI SDK LanguageModel（V2/V3）实例
 * [POS]: Anyhunt LLM 统一模型工厂（对齐 Moryflow ModelProviderFactory，支持 OpenRouter reasoning）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModelV2, LanguageModelV3 } from '@ai-sdk/provider';
import { PRESET_LLM_PROVIDERS } from '../llm.constants';
import { UnsupportedProviderException } from '../llm.errors';

/** 支持的 SDK 类型 */
export type SdkType =
  | 'openai'
  | 'openai-compatible'
  | 'openrouter'
  | 'anthropic'
  | 'google';

export type AiSdkLanguageModel = LanguageModelV2 | LanguageModelV3;

export interface ReasoningOptions {
  enabled?: boolean;
  effort?: 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none';
  maxTokens?: number;
  exclude?: boolean;
  /** 原生配置覆盖（高级选项，直接透传给 API） */
  rawConfig?: Record<string, unknown>;
}

/** Provider 配置 */
interface ProviderOptions {
  apiKey: string;
  baseURL?: string;
}

export interface LlmProviderConfig {
  providerType: string;
  apiKey: string;
  baseUrl?: string | null;
}

export interface LlmModelConfig {
  upstreamId: string;
  reasoning?: ReasoningOptions;
}

/**
 * 模型 Provider 工厂
 * 负责根据配置创建 AI SDK 的 LanguageModel 实例
 */
export class ModelProviderFactory {
  /**
   * 根据 providerType 查找对应的 sdkType
   */
  private static getSdkType(providerType: string): SdkType {
    const preset = PRESET_LLM_PROVIDERS.find((p) => p.id === providerType);
    if (preset) {
      return preset.sdkType as SdkType;
    }
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
    throw new UnsupportedProviderException(providerType);
  }

  /**
   * 创建 LanguageModel 实例
   */
  static create(
    provider: LlmProviderConfig,
    model: LlmModelConfig,
  ): AiSdkLanguageModel {
    const options: ProviderOptions = {
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl || undefined,
    };

    const sdkType = this.getSdkType(provider.providerType);

    return this.createBySdkType(
      sdkType,
      model.upstreamId,
      options,
      model.reasoning,
    );
  }

  /**
   * 根据 SDK 类型创建对应的模型实例
   */
  private static createBySdkType(
    sdkType: SdkType,
    modelId: string,
    options: ProviderOptions,
    reasoning?: ReasoningOptions,
  ): AiSdkLanguageModel {
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
   * 包括 OpenAI、各种 OpenAI-compatible 网关
   */
  private static createOpenAICompatible(
    modelId: string,
    options: ProviderOptions,
    reasoning?: ReasoningOptions,
  ): AiSdkLanguageModel {
    // 明确使用 .chat() 调用 Chat Completions API
    // 默认的 (modelId) 调用会使用 Responses API，第三方服务不完全支持
    const openaiFactory = createOpenAI(options) as {
      chat: (
        modelId: string,
        settings?: Record<string, unknown>,
      ) => AiSdkLanguageModel;
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
   * 创建 OpenRouter 模型
   */
  private static createOpenRouter(
    modelId: string,
    options: ProviderOptions,
    reasoning?: ReasoningOptions,
  ): AiSdkLanguageModel {
    const openrouter = createOpenRouter({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });

    if (reasoning?.enabled || reasoning?.rawConfig) {
      const reasoningParams = reasoning.rawConfig ?? {
        reasoning: this.buildReasoningConfig(reasoning),
      };

      return openrouter.chat(modelId, {
        includeReasoning: true,
        extraBody: reasoningParams,
      }) as unknown as AiSdkLanguageModel;
    }

    return openrouter.chat(modelId) as unknown as AiSdkLanguageModel;
  }

  private static buildReasoningConfig(
    reasoning: ReasoningOptions,
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {
      exclude: reasoning.exclude ?? false,
    };

    if (reasoning.maxTokens !== undefined && reasoning.maxTokens !== null) {
      config.max_tokens = reasoning.maxTokens;
    } else {
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
  ): AiSdkLanguageModel {
    const anthropicFactory = createAnthropic(options) as (
      modelId: string,
      settings?: Record<string, unknown>,
    ) => AiSdkLanguageModel;
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
  ): AiSdkLanguageModel {
    const googleFactory = createGoogleGenerativeAI(options) as (
      modelId: string,
      settings?: Record<string, unknown>,
    ) => AiSdkLanguageModel;
    return googleFactory(
      modelId,
      reasoning?.enabled
        ? {
            thinkingConfig: {
              includeThoughts: true,
              thinkingBudget: reasoning.maxTokens,
            },
          }
        : undefined,
    );
  }
}
