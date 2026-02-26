import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LlmLanguageModelService } from '../llm-language-model.service';
import type { LlmUpstreamResolverService } from '../llm-upstream-resolver.service';
import { ModelProviderFactory } from '../providers/model-provider.factory';

function createMockUpstream(params: {
  resolveUpstream: (args: any) => any;
}): LlmUpstreamResolverService {
  return {
    resolveUpstream: vi.fn().mockImplementation(params.resolveUpstream),
  } as unknown as LlmUpstreamResolverService;
}

describe('LlmLanguageModelService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ModelProviderFactory, 'create').mockReturnValue({} as any);
  });

  it('resolves upstream model and builds language model', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        apiKey: 'sk-test',
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
        },
        model: {
          id: 'm1',
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          inputTokenPrice: 0,
          outputTokenPrice: 0,
          minTier: 'FREE',
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
          capabilitiesJson: null,
          sortOrder: 0,
        },
      }),
    });

    const service = new LlmLanguageModelService(upstream);
    const result = await service.resolveModel({
      purpose: 'agent',
      requestedModelId: 'gpt-4o',
    });

    expect(ModelProviderFactory.create).toHaveBeenCalledWith(
      {
        providerType: 'openai',
        apiKey: 'sk-test',
        baseUrl: 'https://api.openai.com/v1',
      },
      { upstreamId: 'gpt-4o', reasoning: undefined },
    );
    expect(result.upstreamModelId).toBe('gpt-4o');
    expect(result.provider.id).toBe('p1');
    expect(result.modelConfig.maxOutputTokens).toBe(4096);
  });

  it('applies thinking selection from request', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        apiKey: 'sk-test',
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
        },
        model: {
          id: 'm1',
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          inputTokenPrice: 0,
          outputTokenPrice: 0,
          minTier: 'FREE',
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
          capabilitiesJson: {
            reasoning: {
              enabled: true,
            },
          },
          sortOrder: 0,
        },
      }),
    });

    const service = new LlmLanguageModelService(upstream);
    await service.resolveModel({
      purpose: 'agent',
      requestedModelId: 'gpt-4o',
      thinking: {
        mode: 'level',
        level: 'high',
      },
    });

    expect(ModelProviderFactory.create).toHaveBeenCalledWith(
      expect.any(Object),
      {
        upstreamId: 'gpt-4o',
        reasoning: {
          enabled: true,
          effort: 'high',
        },
      },
    );
  });

  it('defaults to off when request does not provide thinking', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        apiKey: 'sk-test',
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
        },
        model: {
          id: 'm1',
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          inputTokenPrice: 0,
          outputTokenPrice: 0,
          minTier: 'FREE',
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
          capabilitiesJson: {
            reasoning: {
              enabled: true,
              effort: 'high',
            },
          },
          sortOrder: 0,
        },
      }),
    });

    const service = new LlmLanguageModelService(upstream);
    await service.resolveModel({
      purpose: 'agent',
      requestedModelId: 'gpt-4o',
    });

    expect(ModelProviderFactory.create).toHaveBeenCalledWith(
      expect.any(Object),
      {
        upstreamId: 'gpt-4o',
        reasoning: undefined,
      },
    );
  });

  it('rejects unsupported thinking level', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        apiKey: 'sk-test',
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
        },
        model: {
          id: 'm1',
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          inputTokenPrice: 0,
          outputTokenPrice: 0,
          minTier: 'FREE',
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
          capabilitiesJson: {
            reasoning: {
              enabled: true,
              levels: ['off', 'low'],
            },
          },
          sortOrder: 0,
        },
      }),
    });

    const service = new LlmLanguageModelService(upstream);
    await expect(
      service.resolveModel({
        purpose: 'agent',
        requestedModelId: 'gpt-4o',
        thinking: {
          mode: 'level',
          level: 'high',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects custom thinking level without provider mapping', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        apiKey: 'sk-test',
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
        },
        model: {
          id: 'm1',
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          inputTokenPrice: 0,
          outputTokenPrice: 0,
          minTier: 'FREE',
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
          capabilitiesJson: {
            reasoning: {
              enabled: true,
              levels: ['off', 'custom-ultra'],
            },
          },
          sortOrder: 0,
        },
      }),
    });

    const service = new LlmLanguageModelService(upstream);
    await expect(
      service.resolveModel({
        purpose: 'agent',
        requestedModelId: 'gpt-4o',
        thinking: {
          mode: 'level',
          level: 'custom-ultra',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts custom thinking level with explicit reasoning mapping', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        requestedModelId: 'gpt-4o',
        upstreamModelId: 'gpt-4o',
        apiKey: 'sk-test',
        provider: {
          id: 'p1',
          providerType: 'openai',
          name: 'OpenAI',
          baseUrl: 'https://api.openai.com/v1',
        },
        model: {
          id: 'm1',
          modelId: 'gpt-4o',
          displayName: 'GPT-4o',
          inputTokenPrice: 0,
          outputTokenPrice: 0,
          minTier: 'FREE',
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
          capabilitiesJson: {
            reasoning: {
              enabled: true,
              levels: [
                {
                  id: 'custom-ultra',
                  label: 'Custom Ultra',
                  reasoning: {
                    effort: 'xhigh',
                  },
                },
              ],
            },
          },
          sortOrder: 0,
        },
      }),
    });

    const service = new LlmLanguageModelService(upstream);
    await service.resolveModel({
      purpose: 'agent',
      requestedModelId: 'gpt-4o',
      thinking: {
        mode: 'level',
        level: 'custom-ultra',
      },
    });

    expect(ModelProviderFactory.create).toHaveBeenCalledWith(
      expect.any(Object),
      {
        upstreamId: 'gpt-4o',
        reasoning: {
          enabled: true,
          effort: 'xhigh',
        },
      },
    );
  });
});
