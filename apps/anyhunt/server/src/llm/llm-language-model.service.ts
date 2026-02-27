/**
 * [INPUT]: requested modelId (optional) + purpose (agent/extract) + thinking selection
 * [OUTPUT]: AI SDK LanguageModel（V2/V3）+ upstreamModelId + provider meta + modelConfig
 * [POS]: LLM 统一语言模型解析器（基于 AI SDK，透传模型上下限配置）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  LlmUpstreamResolverService,
  type LlmPurpose,
} from './llm-upstream-resolver.service';
import {
  type AiSdkLanguageModel,
  ModelProviderFactory,
} from './providers/model-provider.factory';
import type { LlmProviderType } from './dto';
import {
  resolveReasoningFromThinkingSelection,
  type LlmThinkingSelection,
} from './thinking-profile.util';

export type { LlmThinkingSelection } from './thinking-profile.util';

export type ResolvedLlmLanguageModel = {
  model: AiSdkLanguageModel;
  requestedModelId: string;
  upstreamModelId: string;
  modelConfig: {
    maxContextTokens: number;
    maxOutputTokens: number;
  };
  provider: {
    id: string;
    providerType: LlmProviderType;
    name: string;
    baseUrl: string | null;
  };
};

@Injectable()
export class LlmLanguageModelService {
  private readonly logger = new Logger(LlmLanguageModelService.name);

  constructor(private readonly upstream: LlmUpstreamResolverService) {}

  async resolveModel(params: {
    requestedModelId?: string;
    purpose: LlmPurpose;
    thinking?: LlmThinkingSelection;
  }): Promise<ResolvedLlmLanguageModel> {
    const resolved = await this.upstream.resolveUpstream(params);
    const requestedLevel =
      params.thinking?.mode === 'level' ? params.thinking.level : 'off';
    let reasoning: ReturnType<typeof resolveReasoningFromThinkingSelection>;
    try {
      reasoning = params.thinking
        ? resolveReasoningFromThinkingSelection({
            providerType: resolved.provider.providerType,
            capabilitiesJson: resolved.model.capabilitiesJson,
            thinking: params.thinking,
          })
        : undefined;
    } catch (error) {
      const details =
        error instanceof Error ? error.message : 'Unknown thinking error';
      this.logger.warn(
        `[thinking] rejected selection model=${resolved.requestedModelId} provider=${resolved.provider.providerType} requestedLevel=${requestedLevel} reason=${details}`,
      );
      throw error;
    }

    const model = ModelProviderFactory.create(
      {
        providerType: resolved.provider.providerType,
        apiKey: resolved.apiKey,
        baseUrl: resolved.provider.baseUrl,
      },
      { upstreamId: resolved.upstreamModelId, reasoning },
    );

    const resolvedLevel = reasoning ? requestedLevel : 'off';
    this.logger.debug(
      `[thinking] resolved model=${resolved.requestedModelId} provider=${resolved.provider.providerType} requestedLevel=${requestedLevel} resolvedLevel=${resolvedLevel}`,
    );

    return {
      model,
      requestedModelId: resolved.requestedModelId,
      upstreamModelId: resolved.upstreamModelId,
      modelConfig: {
        maxContextTokens: resolved.model.maxContextTokens,
        maxOutputTokens: resolved.model.maxOutputTokens,
      },
      provider: resolved.provider,
    };
  }
}
