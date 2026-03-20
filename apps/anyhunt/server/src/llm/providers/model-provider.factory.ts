/**
 * [INPUT]: Provider config（providerType/apiKey/baseUrl）+ upstreamModelId + reasoning 配置
 * [OUTPUT]: AI SDK LanguageModel（V2/V3）实例
 * [POS]: Anyhunt LLM 统一模型工厂（对齐 Moryflow ModelProviderFactory，支持 OpenRouter reasoning）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import {
  createRuntimeChatLanguageModel,
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

export interface CreatedLanguageModel {
  agentProviderData?: Record<string, unknown>;
  model: AiSdkLanguageModel;
  providerOptions?: Record<string, unknown>;
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
  ): CreatedLanguageModel {
    const options: ProviderOptions = {
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl || undefined,
    };

    const sdkType = this.getSdkType(provider.providerType);

    const created = createRuntimeChatLanguageModel({
      sdkType,
      providerId: provider.providerType,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      modelId: model.upstreamId,
      reasoning: model.reasoning,
    });

    return {
      model: created.model as AiSdkLanguageModel,
      providerOptions: created.providerOptions,
      agentProviderData: created.agentProviderData,
    };
  }
}
