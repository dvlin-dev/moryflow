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
import {
  buildLanguageModelReasoningSettings,
  resolveRuntimeChatSdkType,
} from '@moryflow/model-bank';
import type { LanguageModelV2, LanguageModelV3 } from '@ai-sdk/provider';
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
  includeThoughts?: boolean;
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
   * 根据 providerType 解析对应的 sdkType（统一收敛到 model-bank）
   */
  private static getSdkType(providerType: string): SdkType {
    const resolved = resolveRuntimeChatSdkType({ providerId: providerType });
    if (resolved) {
      return resolved;
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
        return this.createOpenAICompatible(
          sdkType,
          modelId,
          options,
          reasoning,
        );

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
    sdkType: Extract<SdkType, 'openai' | 'openai-compatible'>,
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
    const resolved = buildLanguageModelReasoningSettings({
      sdkType,
      reasoning,
    });
    return openaiFactory.chat(
      modelId,
      resolved?.kind === 'chat-settings' ? resolved.settings : undefined,
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

    const resolved = buildLanguageModelReasoningSettings({
      sdkType: 'openrouter',
      reasoning,
    });
    if (resolved?.kind === 'openrouter-settings') {
      return openrouter.chat(
        modelId,
        resolved.settings,
      ) as unknown as AiSdkLanguageModel;
    }

    return openrouter.chat(modelId) as unknown as AiSdkLanguageModel;
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
    const resolved = buildLanguageModelReasoningSettings({
      sdkType: 'anthropic',
      reasoning,
    });
    return anthropicFactory(
      modelId,
      resolved?.kind === 'chat-settings' ? resolved.settings : undefined,
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
    const resolved = buildLanguageModelReasoningSettings({
      sdkType: 'google',
      reasoning,
    });
    return googleFactory(
      modelId,
      resolved?.kind === 'chat-settings' ? resolved.settings : undefined,
    );
  }
}
