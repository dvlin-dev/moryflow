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

const createBaseResolvedModel = (capabilitiesJson: unknown) => ({
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
    capabilitiesJson,
    sortOrder: 0,
  },
});

describe('LlmLanguageModelService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ModelProviderFactory, 'create').mockReturnValue({} as any);
  });

  it('resolves upstream model and builds language model', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => createBaseResolvedModel(null),
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

  it('applies thinking selection from visible params', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () =>
        createBaseResolvedModel({
          reasoning: {
            levels: [
              { id: 'off', label: 'Off' },
              {
                id: 'high',
                label: 'High',
                visibleParams: [{ key: 'reasoningEffort', value: 'high' }],
              },
            ],
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

  it('passes google includeThoughts from thinking visible params', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () => ({
        ...createBaseResolvedModel({
          reasoning: {
            levels: [
              { id: 'off', label: 'Off' },
              {
                id: 'high',
                label: 'High',
                visibleParams: [
                  { key: 'includeThoughts', value: 'false' },
                  { key: 'thinkingBudget', value: '24576' },
                ],
              },
            ],
          },
        }),
        requestedModelId: 'gemini-2.5-pro',
        upstreamModelId: 'gemini-2.5-pro',
        provider: {
          id: 'p-google',
          providerType: 'google',
          name: 'Google',
          baseUrl: 'https://generativelanguage.googleapis.com',
        },
      }),
    });

    const service = new LlmLanguageModelService(upstream);
    await service.resolveModel({
      purpose: 'agent',
      requestedModelId: 'gemini-2.5-pro',
      thinking: {
        mode: 'level',
        level: 'high',
      },
    });

    expect(ModelProviderFactory.create).toHaveBeenCalledWith(
      {
        providerType: 'google',
        apiKey: 'sk-test',
        baseUrl: 'https://generativelanguage.googleapis.com',
      },
      {
        upstreamId: 'gemini-2.5-pro',
        reasoning: {
          enabled: true,
          includeThoughts: false,
          maxTokens: 24576,
        },
      },
    );
  });

  it('defaults to off when request does not provide thinking', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () =>
        createBaseResolvedModel({
          reasoning: {
            levels: [
              { id: 'off', label: 'Off' },
              {
                id: 'high',
                label: 'High',
                visibleParams: [{ key: 'reasoningEffort', value: 'high' }],
              },
            ],
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

  it('rejects thinking on off-only models with THINKING_NOT_SUPPORTED', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () =>
        createBaseResolvedModel({
          reasoning: {
            levels: [{ id: 'off', label: 'Off' }],
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
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as Record<
        string,
        unknown
      >;
      expect(response.code).toBe('THINKING_NOT_SUPPORTED');
      return true;
    });
  });

  it('rejects invalid thinking level with THINKING_LEVEL_INVALID', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () =>
        createBaseResolvedModel({
          reasoning: {
            levels: [
              { id: 'off', label: 'Off' },
              {
                id: 'low',
                label: 'Low',
                visibleParams: [{ key: 'reasoningEffort', value: 'low' }],
              },
            ],
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
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as Record<
        string,
        unknown
      >;
      expect(response.code).toBe('THINKING_LEVEL_INVALID');
      return true;
    });
  });

  it('rejects level without runtime params as off-only model', async () => {
    const upstream = createMockUpstream({
      resolveUpstream: () =>
        createBaseResolvedModel({
          reasoning: {
            levels: [
              { id: 'off', label: 'Off' },
              {
                id: 'custom',
                label: 'Custom',
              },
            ],
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
          level: 'custom',
        },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as Record<
        string,
        unknown
      >;
      expect(response.code).toBe('THINKING_NOT_SUPPORTED');
      return true;
    });
  });
});
