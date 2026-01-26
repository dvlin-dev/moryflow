import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnsupportedProviderException } from '../llm.errors';

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

describe('ModelProviderFactory', () => {
  const provider = {
    apiKey: 'sk-test',
    baseUrl: 'https://api.example.com',
  };
  let ModelProviderFactory: typeof import('../providers/model-provider.factory').ModelProviderFactory;

  beforeEach(async () => {
    vi.clearAllMocks();
    if (!ModelProviderFactory) {
      ({ ModelProviderFactory } =
        await import('../providers/model-provider.factory'));
    }
  });

  it('creates openai model via chat', () => {
    const chat = vi.fn().mockReturnValue('openai-model');
    mocks.createOpenAI.mockReturnValue({ chat } as any);

    const model = ModelProviderFactory.create(
      { providerType: 'openai', ...provider },
      { upstreamId: 'gpt-4o' },
    );

    expect(mocks.createOpenAI).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
    });
    expect(chat).toHaveBeenCalledWith('gpt-4o');
    expect(model).toBe('openai-model');
  });

  it('creates openai-compatible model via chat', () => {
    const chat = vi.fn().mockReturnValue('compat-model');
    mocks.createOpenAI.mockReturnValue({ chat } as any);

    const model = ModelProviderFactory.create(
      { providerType: 'openai-compatible', ...provider },
      { upstreamId: 'gpt-4o-mini' },
    );

    expect(chat).toHaveBeenCalledWith('gpt-4o-mini');
    expect(model).toBe('compat-model');
  });

  it('creates openrouter model via chat', () => {
    const chat = vi.fn().mockReturnValue('openrouter-model');
    mocks.createOpenRouter.mockReturnValue({ chat } as any);

    const model = ModelProviderFactory.create(
      { providerType: 'openrouter', ...provider },
      { upstreamId: 'openrouter/gpt-4o' },
    );

    expect(mocks.createOpenRouter).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
    });
    expect(chat).toHaveBeenCalledWith('openrouter/gpt-4o');
    expect(model).toBe('openrouter-model');
  });

  it('creates openrouter model with reasoning config', () => {
    const chat = vi.fn().mockReturnValue('openrouter-model');
    mocks.createOpenRouter.mockReturnValue({ chat } as any);

    ModelProviderFactory.create(
      { providerType: 'openrouter', ...provider },
      {
        upstreamId: 'openrouter/gpt-4o',
        reasoning: { enabled: true, effort: 'high' },
      },
    );

    expect(chat).toHaveBeenCalledWith('openrouter/gpt-4o', {
      includeReasoning: true,
      extraBody: { reasoning: { exclude: false, effort: 'high' } },
    });
  });

  it('creates anthropic model', () => {
    const anthropic = vi.fn().mockReturnValue('anthropic-model');
    mocks.createAnthropic.mockReturnValue(anthropic as any);

    const model = ModelProviderFactory.create(
      { providerType: 'anthropic', ...provider },
      { upstreamId: 'claude-3-5-sonnet' },
    );

    expect(mocks.createAnthropic).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
    });
    expect(anthropic).toHaveBeenCalledWith('claude-3-5-sonnet');
    expect(model).toBe('anthropic-model');
  });

  it('creates google model', () => {
    const google = vi.fn().mockReturnValue('google-model');
    mocks.createGoogleGenerativeAI.mockReturnValue(google as any);

    const model = ModelProviderFactory.create(
      { providerType: 'google', ...provider },
      { upstreamId: 'gemini-1.5-pro' },
    );

    expect(mocks.createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
    });
    expect(google).toHaveBeenCalledWith('gemini-1.5-pro');
    expect(model).toBe('google-model');
  });

  it('throws for unsupported provider type', () => {
    expect(() =>
      ModelProviderFactory.create(
        { providerType: 'unknown', ...provider },
        { upstreamId: 'gpt-4o' },
      ),
    ).toThrow('Unsupported provider type: unknown');
  });

  it('maps preset provider type to sdk type', () => {
    const chat = vi.fn().mockReturnValue('compat-model');
    mocks.createOpenAI.mockReturnValue({ chat } as any);

    const model = ModelProviderFactory.create(
      { providerType: 'zenmux', ...provider },
      { upstreamId: 'gpt-4o-mini' },
    );

    expect(chat).toHaveBeenCalledWith('gpt-4o-mini');
    expect(model).toBe('compat-model');
  });
});
