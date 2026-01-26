/**
 * [INPUT]: requested modelId (optional) + purpose (agent/extract)
 * [OUTPUT]: AI SDK LanguageModel（V2/V3）+ upstreamModelId + provider meta + modelConfig
 * [POS]: LLM 统一语言模型解析器（基于 AI SDK，透传模型上下限配置）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import {
  LlmUpstreamResolverService,
  type LlmPurpose,
} from './llm-upstream-resolver.service';
import {
  type AiSdkLanguageModel,
  ModelProviderFactory,
  type ReasoningOptions,
} from './providers/model-provider.factory';
import type { LlmProviderType } from './dto';

function parseReasoningConfig(
  capabilitiesJson: unknown,
): ReasoningOptions | undefined {
  if (!capabilitiesJson) return undefined;
  let data: Record<string, unknown> | null = null;
  if (typeof capabilitiesJson === 'string') {
    try {
      data = JSON.parse(capabilitiesJson) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  } else if (typeof capabilitiesJson === 'object') {
    data = capabilitiesJson as Record<string, unknown>;
  }

  if (!data) return undefined;

  const reasoning = data.reasoning as Record<string, unknown> | undefined;
  if (!reasoning) return undefined;

  const enabled = reasoning.enabled === true;
  const rawConfig =
    reasoning.rawConfig && typeof reasoning.rawConfig === 'object'
      ? (reasoning.rawConfig as Record<string, unknown>)
      : undefined;

  if (!enabled && !rawConfig) {
    return undefined;
  }

  const effort = reasoning.effort;
  const allowedEffort = new Set([
    'xhigh',
    'high',
    'medium',
    'low',
    'minimal',
    'none',
  ]);

  return {
    enabled,
    effort: allowedEffort.has(String(effort))
      ? (effort as ReasoningOptions['effort'])
      : 'medium',
    maxTokens:
      typeof reasoning.maxTokens === 'number' ? reasoning.maxTokens : undefined,
    exclude: reasoning.exclude === true,
    rawConfig,
  };
}

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
  constructor(private readonly upstream: LlmUpstreamResolverService) {}

  async resolveModel(params: {
    requestedModelId?: string;
    purpose: LlmPurpose;
  }): Promise<ResolvedLlmLanguageModel> {
    const resolved = await this.upstream.resolveUpstream(params);
    const reasoning = parseReasoningConfig(resolved.model.capabilitiesJson);

    const model = ModelProviderFactory.create(
      {
        providerType: resolved.provider.providerType,
        apiKey: resolved.apiKey,
        baseUrl: resolved.provider.baseUrl,
      },
      { upstreamId: resolved.upstreamModelId, reasoning },
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
