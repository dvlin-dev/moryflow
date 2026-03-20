import {
  createRuntimeChatLanguageModel,
  resolveRuntimeChatSdkType,
} from '@moryflow/model-bank';
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
export interface CreatedLanguageModel {
  model: LanguageModel;
  providerOptions?: Record<string, unknown>;
}

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
    provider: AiProvider,
    model: AiModel,
    reasoning?: ReasoningOptions,
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
      reasoning,
    });

    return {
      model: created.model as LanguageModel,
      providerOptions: created.providerOptions,
    };
  }
}
