import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiModel, AiProvider } from '../../../generated/prisma/client';

const mocks = vi.hoisted(() => ({
  createOpenAI: vi.fn(),
  createAnthropic: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  createOpenRouter: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: mocks.createOpenAI,
}));
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: mocks.createAnthropic,
}));
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mocks.createGoogleGenerativeAI,
}));
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: mocks.createOpenRouter,
}));

describe('ModelProviderFactory thinking injection', () => {
  let ModelProviderFactory: typeof import('./model-provider.factory').ModelProviderFactory;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ ModelProviderFactory } = await import('./model-provider.factory'));
  });

  const buildProvider = (providerType: string): AiProvider =>
    ({
      id: 'provider-id',
      providerType,
      name: providerType,
      apiKey: 'sk-test',
      baseUrl: 'https://api.example.com',
      enabled: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as AiProvider;

  const baseModel = {
    id: 'model-id',
    providerId: 'provider-id',
    modelId: 'test-model',
    upstreamId: 'test-model',
    displayName: 'Test Model',
    enabled: true,
    inputTokenPrice: 1,
    outputTokenPrice: 1,
    minTier: 'free',
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
    capabilitiesJson: {},
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as AiModel;

  it('injects reasoningEffort for openai chat', () => {
    const chat = vi.fn().mockReturnValue('openai-model');
    mocks.createOpenAI.mockReturnValue({ chat } as never);

    ModelProviderFactory.create(buildProvider('openai'), baseModel, {
      enabled: true,
      effort: 'high',
    });

    expect(chat).toHaveBeenCalledWith('test-model', {
      reasoningEffort: 'high',
    });
  });

  it('injects anthropic thinking budget', () => {
    const anthropic = vi.fn().mockReturnValue('anthropic-model');
    mocks.createAnthropic.mockReturnValue(anthropic as never);

    ModelProviderFactory.create(buildProvider('anthropic'), baseModel, {
      enabled: true,
      maxTokens: 16000,
    });

    expect(anthropic).toHaveBeenCalledWith('test-model', {
      thinking: {
        type: 'enabled',
        budgetTokens: 16000,
      },
    });
  });

  it('injects google thinkingConfig from reasoning options', () => {
    const google = vi.fn().mockReturnValue('google-model');
    mocks.createGoogleGenerativeAI.mockReturnValue(google as never);

    ModelProviderFactory.create(buildProvider('google'), baseModel, {
      enabled: true,
      maxTokens: 20000,
      includeThoughts: false,
    });

    expect(google).toHaveBeenCalledWith('test-model', {
      thinkingConfig: {
        includeThoughts: false,
        thinkingBudget: 20000,
      },
    });
  });

  it('keeps google includeThoughts default when not provided', () => {
    const google = vi.fn().mockReturnValue('google-model');
    mocks.createGoogleGenerativeAI.mockReturnValue(google as never);

    ModelProviderFactory.create(buildProvider('google'), baseModel, {
      enabled: true,
      maxTokens: 12000,
    });

    expect(google).toHaveBeenCalledWith('test-model', {
      thinkingConfig: {
        includeThoughts: true,
        thinkingBudget: 12000,
      },
    });
  });
});
