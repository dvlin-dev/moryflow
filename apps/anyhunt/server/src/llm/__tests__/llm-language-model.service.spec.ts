import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  });
});
