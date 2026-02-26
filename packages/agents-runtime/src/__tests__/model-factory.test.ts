import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentSettings, PresetProvider, ProviderSdkType } from '../types';

const mocks = vi.hoisted(() => ({
  createAnthropic: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  aisdk: vi.fn((model: unknown) => model),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: mocks.createAnthropic,
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mocks.createGoogleGenerativeAI,
}));

vi.mock('@openai/agents-extensions', () => ({
  aisdk: mocks.aisdk,
}));

import { createModelFactory } from '../model-factory';

const createSettings = (
  providerId: string,
  modelId: string,
  options?: {
    reasoningCapability?: boolean;
  },
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

const createRegistry = (
  providerId: string,
  sdkType: ProviderSdkType,
  modelId: string,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes anthropic thinking settings when level thinking is enabled', () => {
    const anthropicChat = vi.fn().mockReturnValue({} as any);
    mocks.createAnthropic.mockReturnValue({ chat: anthropicChat });

    const modelId = 'claude-sonnet-4-5';
    const factory = createModelFactory({
      settings: createSettings('anthropic', modelId, {
        reasoningCapability: true,
      }),
      providerRegistry: createRegistry('anthropic', 'anthropic', modelId),
      toApiModelId: (_, id) => id,
    });

    factory.buildModel(modelId, {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(anthropicChat).toHaveBeenCalledWith(modelId, {
      thinking: {
        type: 'enabled',
        budgetTokens: 16384,
      },
    });
  });

  it('defaults to thinking support when reasoning capability is not configured', () => {
    const anthropicChat = vi.fn().mockReturnValue({} as any);
    mocks.createAnthropic.mockReturnValue({ chat: anthropicChat });

    const modelId = 'claude-sonnet-4-5';
    const factory = createModelFactory({
      settings: createSettings('anthropic', modelId),
      providerRegistry: createRegistry('anthropic', 'anthropic', modelId),
      toApiModelId: (_, id) => id,
    });

    const result = factory.buildModel(modelId, {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(result.resolvedThinkingLevel).toBe('high');
    expect(result.thinkingDowngradedToOff).toBe(false);
    expect(anthropicChat).toHaveBeenCalledWith(modelId, {
      thinking: {
        type: 'enabled',
        budgetTokens: 16384,
      },
    });
  });

  it('downgrades thinking to off when reasoning capability is explicitly disabled', () => {
    const anthropicChat = vi.fn().mockReturnValue({} as any);
    mocks.createAnthropic.mockReturnValue({ chat: anthropicChat });

    const modelId = 'claude-sonnet-4-5';
    const factory = createModelFactory({
      settings: createSettings('anthropic', modelId, {
        reasoningCapability: false,
      }),
      providerRegistry: createRegistry('anthropic', 'anthropic', modelId),
      toApiModelId: (_, id) => id,
    });

    const result = factory.buildModel(modelId, {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(result.resolvedThinkingLevel).toBe('off');
    expect(result.thinkingDowngradedToOff).toBe(true);
    expect(anthropicChat).toHaveBeenCalledWith(modelId, undefined);
  });

  it('passes google thinking settings when level thinking is enabled', () => {
    const googleChat = vi.fn().mockReturnValue({} as any);
    mocks.createGoogleGenerativeAI.mockReturnValue(googleChat);

    const modelId = 'gemini-2.5-pro';
    const factory = createModelFactory({
      settings: createSettings('google', modelId, {
        reasoningCapability: true,
      }),
      providerRegistry: createRegistry('google', 'google', modelId),
      toApiModelId: (_, id) => id,
    });

    factory.buildModel(modelId, {
      thinking: { mode: 'level', level: 'high' },
    });

    expect(googleChat).toHaveBeenCalledWith(modelId, {
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 16384,
      },
    });
  });
});
