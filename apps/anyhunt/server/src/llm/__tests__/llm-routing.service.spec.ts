import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LlmRoutingService } from '../llm-routing.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { OpenAIProvider } from '@anyhunt/agents-openai';
import type { Model } from '@anyhunt/agents-core';
import type { LlmUpstreamResolverService } from '../llm-upstream-resolver.service';

function createMockUpstream(params: {
  resolveUpstream: (args: any) => any;
}): LlmUpstreamResolverService {
  return {
    resolveUpstream: vi.fn().mockImplementation(params.resolveUpstream),
  } as unknown as LlmUpstreamResolverService;
}

describe('LlmRoutingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(OpenAIProvider.prototype, 'getModel').mockResolvedValue(
      {} as unknown as Model,
    );
  });

  it('falls back to admin defaultAgentModelId', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        apiKey: 'sk-test',
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: null,
        },
      }),
    });

    const service = new LlmRoutingService(upstream);
    const result = await service.resolveAgentModel(undefined);
    expect(result.requestedModelId).toBe('gpt-4o');
    expect(upstream.resolveUpstream).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'agent' }),
    );
  });

  it('uses resolved upstream model + provider meta', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        apiKey: 'sk-test',
        provider: {
          id: 'p2',
          providerType: 'openai',
          name: 'OpenAI-2',
          baseUrl: 'https://api.openai.com/v1',
        },
      }),
    });

    const service = new LlmRoutingService(upstream);
    const result = await service.resolveAgentModel('gpt-4o');
    expect(result.provider.id).toBe('p2');
    expect(result.provider.baseUrl).toBe('https://api.openai.com/v1');
    expect(result.upstreamModelId).toBe('gpt-4o');
  });

  it('throws when model is not available', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => {
        throw new BadRequestException('Model is not available');
      },
    });
    const service = new LlmRoutingService(upstream);
    await expect(service.resolveAgentModel('gpt-4o')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws 500 when upstream resolver throws 500', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => {
        throw new InternalServerErrorException('boom');
      },
    });
    const service = new LlmRoutingService(upstream);
    await expect(service.resolveAgentModel('gpt-4o')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('falls back to admin defaultExtractModelId', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o-mini',
        upstreamModelId: 'gpt-4o-mini',
        apiKey: 'sk-test',
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: null,
        },
      }),
    });

    const service = new LlmRoutingService(upstream);
    const result = await service.resolveExtractModel(undefined);
    expect(result.requestedModelId).toBe('gpt-4o-mini');
    expect(upstream.resolveUpstream).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'extract' }),
    );
  });
});
