/**
 * [INPUT]: requested modelId (optional) + purpose (agent/extract)
 * [OUTPUT]: OpenAI client + upstreamModelId + provider meta
 * [POS]: 供需要 OpenAI SDK 的模块（如 Extract）复用的 OpenAI-compatible client 工厂（密钥/baseUrl 由 DB 决定）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  LlmUpstreamResolverService,
  type LlmPurpose,
} from './llm-upstream-resolver.service';

export type LlmOpenAiResolvedClient = {
  client: OpenAI;
  requestedModelId: string;
  upstreamModelId: string;
  provider: {
    id: string;
    providerType: string;
    name: string;
    baseUrl: string | null;
  };
};

@Injectable()
export class LlmOpenAiClientService {
  constructor(private readonly upstream: LlmUpstreamResolverService) {}

  async resolveClient(params: {
    requestedModelId?: string;
    purpose: LlmPurpose;
  }): Promise<LlmOpenAiResolvedClient> {
    const resolved = await this.upstream.resolveUpstream(params);

    const providerType = resolved.provider.providerType;
    if (
      providerType !== 'openai' &&
      providerType !== 'openai_compatible' &&
      providerType !== 'openrouter'
    ) {
      throw new BadRequestException('LLM provider type is not supported');
    }

    const client = new OpenAI({
      apiKey: resolved.apiKey,
      baseURL: resolved.provider.baseUrl ?? undefined,
    });

    return {
      client,
      requestedModelId: resolved.requestedModelId,
      upstreamModelId: resolved.upstreamModelId,
      provider: resolved.provider,
    };
  }
}
