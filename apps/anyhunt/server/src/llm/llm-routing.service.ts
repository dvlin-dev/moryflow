/**
 * [INPUT]: requested modelId (optional; fallback to Admin default by purpose)
 * [OUTPUT]: ResolvedLlmRoute（确定 provider + upstreamModelId + Model 实例）
 * [POS]: 运行时 LLM 路由器：将“对外 modelId”映射为“上游 upstreamId”，并加载对应 provider 的密钥/baseUrl
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { OpenAIProvider } from '@anyhunt/agents-openai';
import type { Model } from '@anyhunt/agents-core';
import type { ResolvedLlmRoute } from './llm.types';
import type { LlmProviderType } from './dto';
import {
  LlmUpstreamResolverService,
  type LlmPurpose,
} from './llm-upstream-resolver.service';

@Injectable()
export class LlmRoutingService {
  constructor(private readonly upstream: LlmUpstreamResolverService) {}

  private buildModelProviderOrThrow(params: {
    providerType: LlmProviderType;
    apiKey: string;
    baseUrl: string | null;
  }): { getModel: (modelName?: string) => Promise<Model> } {
    const { providerType, apiKey, baseUrl } = params;

    if (
      providerType === 'openai' ||
      providerType === 'openai_compatible' ||
      providerType === 'openrouter'
    ) {
      return new OpenAIProvider({
        apiKey,
        baseURL: baseUrl ?? undefined,
        useResponses: false,
      });
    }

    throw new BadRequestException('LLM provider type is not supported');
  }

  private async resolveModelInternal(params: {
    requestedModelId?: string;
    purpose: LlmPurpose;
  }): Promise<ResolvedLlmRoute> {
    const resolved = await this.upstream.resolveUpstream(params);

    const provider = this.buildModelProviderOrThrow({
      providerType: resolved.provider.providerType,
      apiKey: resolved.apiKey,
      baseUrl: resolved.provider.baseUrl,
    });

    const model = await provider.getModel(resolved.upstreamModelId);

    return {
      requestedModelId: resolved.requestedModelId,
      provider: {
        id: resolved.provider.id,
        providerType: resolved.provider.providerType,
        name: resolved.provider.name,
        baseUrl: resolved.provider.baseUrl,
      },
      upstreamModelId: resolved.upstreamModelId,
      model,
    };
  }

  resolveAgentModel(requestedModelId?: string): Promise<ResolvedLlmRoute> {
    return this.resolveModelInternal({ requestedModelId, purpose: 'agent' });
  }

  resolveExtractModel(requestedModelId?: string): Promise<ResolvedLlmRoute> {
    return this.resolveModelInternal({ requestedModelId, purpose: 'extract' });
  }
}
