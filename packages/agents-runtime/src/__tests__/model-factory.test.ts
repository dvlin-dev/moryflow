import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentSettings, PresetProvider, ProviderSdkType } from '../types';

const mocks = vi.hoisted(() => ({
  createRuntimeChatLanguageModel: vi.fn(() => ({
    model: {} as any,
    providerOptions: undefined,
    agentProviderData: undefined,
  })),
  aisdk: vi.fn((model: unknown) => model),
}));

vi.mock('@moryflow/model-bank', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@moryflow/model-bank')>();
  return {
    ...actual,
    createRuntimeChatLanguageModel: mocks.createRuntimeChatLanguageModel,
  };
});

vi.mock('@openai/agents-extensions', () => ({
  aisdk: mocks.aisdk,
}));

import { createModelFactory } from '../model-factory';

const createSettings = (
  providerId: string,
  modelId: string,
  options?: {
    reasoningCapability?: boolean;
  }
): AgentSettings => ({
  model: {
    defaultModel: `${providerId}/${modelId}`,
  },
  providers: [
    {
      providerId,
      enabled: true,
      apiKey: 'test-key',
      baseUrl: null,
      models: [
        {
          id: modelId,
          enabled: true,
          ...(typeof options?.reasoningCapability === 'boolean'
            ? {
                customCapabilities: {
                  reasoning: options.reasoningCapability,
                },
              }
            : {}),
        },
      ],
      defaultModelId: modelId,
    },
  ],
  customProviders: [],
});

const createSettingsWithEmptyModels = (
  providerId: string,
  defaultModelId: string
): AgentSettings => ({
  model: {
    defaultModel: null,
  },
  providers: [
    {
      providerId,
      enabled: true,
      apiKey: 'test-key',
      baseUrl: null,
      models: [],
      defaultModelId,
    },
  ],
  customProviders: [],
});

const createRegistry = (
  providerId: string,
  sdkType: ProviderSdkType,
  modelId: string
): Record<string, PresetProvider> => ({
  [providerId]: {
    id: providerId,
    name: providerId,
    sdkType,
    modelIds: [modelId],
    defaultBaseUrl: 'https://example.com',
  },
});

describe('model-factory reasoning mapping', () => {
  const toModelRef = (providerId: string, modelId: string) => `${providerId}/${modelId}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes anthropic thinking settings when level thinking is enabled', () => {
    const modelId = 'claude-sonnet-4-20250514';
    const factory = createModelFactory({
      settings: createSettings('anthropic', modelId, {
        reasoningCapability: true,
      }),
      providerRegistry: createRegistry('anthropic', 'anthropic', modelId),
      toApiModelId: (_, id) => id,
    });

    factory.buildModel(toModelRef('anthropic', modelId), {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'anthropic',
        modelId,
        reasoning: expect.objectContaining({
          enabled: true,
          maxTokens: 16384,
        }),
      })
    );
  });

  it('defaults to thinking support when reasoning capability is not configured', () => {
    const modelId = 'claude-sonnet-4-20250514';
    const factory = createModelFactory({
      settings: createSettings('anthropic', modelId),
      providerRegistry: createRegistry('anthropic', 'anthropic', modelId),
      toApiModelId: (_, id) => id,
    });

    const result = factory.buildModel(toModelRef('anthropic', modelId), {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(result.resolvedThinkingLevel).toBe('high');
    expect(result.thinkingDowngradedToOff).toBe(false);
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'anthropic',
        modelId,
        reasoning: expect.objectContaining({
          enabled: true,
          maxTokens: 16384,
        }),
      })
    );
  });

  it('downgrades thinking to off when reasoning capability is explicitly disabled', () => {
    const modelId = 'claude-sonnet-4-20250514';
    const factory = createModelFactory({
      settings: createSettings('anthropic', modelId, {
        reasoningCapability: false,
      }),
      providerRegistry: createRegistry('anthropic', 'anthropic', modelId),
      toApiModelId: (_, id) => id,
    });

    const result = factory.buildModel(toModelRef('anthropic', modelId), {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(result.resolvedThinkingLevel).toBe('off');
    expect(result.thinkingDowngradedToOff).toBe(true);
    expect(result.thinkingDowngradeReason).toBe('requested-level-not-allowed');
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'anthropic',
        modelId,
        reasoning: undefined,
      })
    );
  });

  it('passes google thinking settings when level thinking is enabled', () => {
    const modelId = 'gemini-2.5-pro';
    const factory = createModelFactory({
      settings: createSettings('google', modelId, {
        reasoningCapability: true,
      }),
      providerRegistry: createRegistry('google', 'google', modelId),
      toApiModelId: (_, id) => id,
    });

    factory.buildModel(toModelRef('google', modelId), {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'google',
        modelId,
        reasoning: expect.objectContaining({
          enabled: true,
          maxTokens: 16384,
        }),
      })
    );
  });

  it('passes openrouter reasoning effort when request carries explicit thinking profile', () => {
    const modelId = 'gpt-5';
    const factory = createModelFactory({
      settings: createSettings('openrouter', modelId, {
        reasoningCapability: true,
      }),
      providerRegistry: createRegistry('openrouter', 'openrouter', modelId),
      toApiModelId: (_, id) => id,
    });

    factory.buildModel(toModelRef('openrouter', modelId), {
      thinking: { mode: 'level', level: 'high' },
      thinkingProfile: {
        supportsThinking: true,
        defaultLevel: 'off',
        levels: [
          { id: 'off', label: 'Off' },
          {
            id: 'high',
            label: 'High',
            visibleParams: [{ key: 'reasoningEffort', value: 'high' }],
          },
        ],
      },
    });

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'openrouter',
        modelId,
        reasoning: expect.objectContaining({
          enabled: true,
        }),
      })
    );
  });

  it('routes preset openai with custom baseUrl through openai-compatible transport', () => {
    const modelId = 'Pro/moonshotai/Kimi-K2.5';
    const factory = createModelFactory({
      settings: {
        model: {
          defaultModel: `openai/${modelId}`,
        },
        providers: [
          {
            providerId: 'openai',
            enabled: true,
            apiKey: 'test-key',
            baseUrl: 'https://api.siliconflow.cn/v1',
            models: [{ id: modelId, enabled: true, isCustom: true }],
            defaultModelId: modelId,
          },
        ],
        customProviders: [],
      },
      providerRegistry: createRegistry('openai', 'openai', modelId),
      toApiModelId: (_, id) => id,
    });

    const result = factory.buildModel(`openai/${modelId}`);

    expect(result.providerOptions).toEqual({
      reasoningContentToolCalls: true,
    });
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'openai-compatible',
        modelId,
        apiKey: 'test-key',
        baseURL: 'https://api.siliconflow.cn/v1',
      })
    );
  });

  it('emits openai-compatible reasoning provider options instead of dropping settings', () => {
    const modelId = 'moonshotai/kimi-k2.5';
    const factory = createModelFactory({
      settings: createSettings('nvidia', modelId, {
        reasoningCapability: true,
      }),
      providerRegistry: createRegistry('nvidia', 'openai-compatible', modelId),
      toApiModelId: (_, id) => id,
    });

    const result = factory.buildModel(toModelRef('nvidia', modelId), {
      thinkingProfile: {
        supportsThinking: true,
        defaultLevel: 'off',
        levels: [
          { id: 'off', label: 'Off' },
          {
            id: 'on',
            label: 'On',
            visibleParams: [{ key: 'enableReasoning', value: 'true' }],
          },
        ],
      },
      thinking: { mode: 'level', level: 'on' },
    });

    expect(result.providerOptions).toEqual({
      openaiCompatible: {
        enableReasoning: true,
      },
      reasoningContentToolCalls: true,
    });
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'openai-compatible',
        modelId,
      })
    );
  });

  it('keeps thinking enabled for openrouter anthropic models even if registry sdkType is openai', () => {
    const modelId = 'anthropic/claude-sonnet-4.5';
    const factory = createModelFactory({
      settings: createSettings('openrouter', modelId, {
        reasoningCapability: true,
      }),
      // 模拟上游 provider 元数据仍标记为 openai 的场景。
      providerRegistry: createRegistry('openrouter', 'openai', modelId),
      toApiModelId: (_, id) => id,
    });

    const result = factory.buildModel(toModelRef('openrouter', modelId), {
      thinking: { mode: 'level', level: 'medium' },
    });

    expect(result.resolvedThinkingLevel).toBe('medium');
    expect(result.thinkingDowngradedToOff).toBe(false);
    expect(result.thinkingDowngradeReason).toBeUndefined();
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'openrouter',
        modelId,
        reasoning: expect.objectContaining({
          enabled: true,
        }),
      })
    );
  });

  it('passes provider-internal id to toApiModelId for openrouter multi-segment model ids', () => {
    const modelId = 'minimax/minimax-m2.1';
    const toApiModelId = vi.fn((_: string, id: string) => id);
    const factory = createModelFactory({
      settings: createSettings('openrouter', modelId, {
        reasoningCapability: true,
      }),
      providerRegistry: createRegistry('openrouter', 'openrouter', modelId),
      toApiModelId,
    });

    factory.buildRawModel(toModelRef('openrouter', modelId));

    expect(toApiModelId).toHaveBeenCalledWith('openrouter', modelId);
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'openrouter',
        modelId,
      })
    );
  });

  it('respects provider defaultModelId when provider has no explicit model config', () => {
    const firstModel = 'claude-sonnet-4-20250514';
    const defaultModel = 'claude-3-5-haiku-20241022';
    const factory = createModelFactory({
      settings: createSettingsWithEmptyModels('anthropic', defaultModel),
      providerRegistry: {
        anthropic: {
          id: 'anthropic',
          name: 'anthropic',
          sdkType: 'anthropic',
          modelIds: [firstModel, defaultModel],
          defaultBaseUrl: 'https://example.com',
        },
      },
      toApiModelId: (_, id) => id,
    });

    const result = factory.buildModel();

    expect(result.modelId).toBe(`anthropic/${defaultModel}`);
    expect(factory.defaultModelId).toBe(`anthropic/${defaultModel}`);
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({
        sdkType: 'anthropic',
        modelId: defaultModel,
        reasoning: undefined,
      })
    );
  });

  it('throws when provider has no explicit runtime sdk adapter mapping', () => {
    const modelId = 'gpt-4o-mini';
    const factory = createModelFactory({
      settings: createSettings('custom-unknown', modelId),
      providerRegistry: createRegistry('custom-unknown', 'unknown-adapter', modelId),
      toApiModelId: (_, id) => id,
    });

    expect(() => factory.buildModel(toModelRef('custom-unknown', modelId))).toThrow(
      /缺少显式 runtime sdkType 映射/
    );
  });
});
