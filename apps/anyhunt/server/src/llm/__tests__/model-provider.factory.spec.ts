import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnsupportedProviderException } from '../llm.errors';

const mocks = vi.hoisted(() => ({
  createRuntimeChatLanguageModel: vi.fn(),
  resolveRuntimeChatSdkType: vi.fn(),
}));

vi.mock('@moryflow/model-bank', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@moryflow/model-bank')>();
  return {
    ...actual,
    createRuntimeChatLanguageModel: mocks.createRuntimeChatLanguageModel,
    resolveRuntimeChatSdkType: mocks.resolveRuntimeChatSdkType,
  };
});

describe('ModelProviderFactory', () => {
  const provider = {
    apiKey: 'sk-test',
    baseUrl: 'https://api.example.com',
  };
  let ModelProviderFactory: typeof import('../providers/model-provider.factory').ModelProviderFactory;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    ({ ModelProviderFactory } =
      await import('../providers/model-provider.factory'));
  });

  it('creates openai model via createRuntimeChatLanguageModel', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('openai');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'openai-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    const created = ModelProviderFactory.create(
      { providerType: 'openai', ...provider },
      { upstreamId: 'gpt-4o' },
    );

    expect(mocks.resolveRuntimeChatSdkType).toHaveBeenCalledWith({
      providerId: 'openai',
    });
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'openai',
      providerId: 'openai',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'gpt-4o',
      reasoning: undefined,
    });
    expect(created.model).toBe('openai-model');
  });

  it('creates openai-compatible model via createRuntimeChatLanguageModel', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('openai-compatible');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'compat-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    const created = ModelProviderFactory.create(
      { providerType: 'openai-compatible', ...provider },
      { upstreamId: 'gpt-4o-mini' },
    );

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'openai-compatible',
      providerId: 'openai-compatible',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'gpt-4o-mini',
      reasoning: undefined,
    });
    expect(created.model).toBe('compat-model');
    expect(created.providerOptions).toBeUndefined();
    expect(created.agentProviderData).toBeUndefined();
  });

  it('creates openai model with reasoning config', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('openai');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'openai-model',
      providerOptions: { openai: { reasoningEffort: 'high' } },
      agentProviderData: { openai: { reasoningEffort: 'high' } },
    });

    const created = ModelProviderFactory.create(
      { providerType: 'openai', ...provider },
      {
        upstreamId: 'gpt-4o',
        reasoning: { enabled: true, effort: 'high' },
      },
    );

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'openai',
      providerId: 'openai',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'gpt-4o',
      reasoning: { enabled: true, effort: 'high' },
    });
    expect(created.providerOptions).toEqual({
      openai: { reasoningEffort: 'high' },
    });
    expect(created.agentProviderData).toEqual({
      openai: { reasoningEffort: 'high' },
    });
  });

  it('emits openai-compatible providerOptions and agentProviderData for reasoning', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('openai-compatible');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'compat-model',
      providerOptions: { openaiCompatible: { enableReasoning: false } },
      agentProviderData: {
        openaiCompatible: { enableReasoning: false },
        reasoningContentToolCalls: true,
      },
    });

    const created = ModelProviderFactory.create(
      { providerType: 'azure', ...provider },
      {
        upstreamId: 'kimi-k2.5',
        reasoning: {
          enabled: false,
          rawConfig: { enableReasoning: false },
        },
      },
    );

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'openai-compatible',
      providerId: 'azure',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'kimi-k2.5',
      reasoning: {
        enabled: false,
        rawConfig: { enableReasoning: false },
      },
    });
    expect(created.providerOptions).toEqual({
      openaiCompatible: { enableReasoning: false },
    });
    expect(created.agentProviderData).toEqual({
      openaiCompatible: { enableReasoning: false },
      reasoningContentToolCalls: true,
    });
  });

  it('creates openrouter model via createRuntimeChatLanguageModel', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('openrouter');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'openrouter-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    const created = ModelProviderFactory.create(
      { providerType: 'openrouter', ...provider },
      { upstreamId: 'openrouter/gpt-4o' },
    );

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'openrouter',
      providerId: 'openrouter',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'openrouter/gpt-4o',
      reasoning: undefined,
    });
    expect(created.model).toBe('openrouter-model');
  });

  it('creates openrouter model with reasoning config', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('openrouter');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'openrouter-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    ModelProviderFactory.create(
      { providerType: 'openrouter', ...provider },
      {
        upstreamId: 'openrouter/gpt-4o',
        reasoning: { enabled: true, effort: 'high' },
      },
    );

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'openrouter',
      providerId: 'openrouter',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'openrouter/gpt-4o',
      reasoning: { enabled: true, effort: 'high' },
    });
  });

  it('creates anthropic model', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('anthropic');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'anthropic-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    const created = ModelProviderFactory.create(
      { providerType: 'anthropic', ...provider },
      { upstreamId: 'claude-3-5-sonnet' },
    );

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'anthropic',
      providerId: 'anthropic',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'claude-3-5-sonnet',
      reasoning: undefined,
    });
    expect(created.model).toBe('anthropic-model');
  });

  it('creates google model', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('google');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'google-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    const created = ModelProviderFactory.create(
      { providerType: 'google', ...provider },
      { upstreamId: 'gemini-1.5-pro' },
    );

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'google',
      providerId: 'google',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'gemini-1.5-pro',
      reasoning: undefined,
    });
    expect(created.model).toBe('google-model');
  });

  it('creates google model with reasoning config (maxTokens + includeThoughts)', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('google');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'google-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    ModelProviderFactory.create(
      { providerType: 'google', ...provider },
      {
        upstreamId: 'gemini-1.5-pro',
        reasoning: {
          enabled: true,
          maxTokens: 20000,
          includeThoughts: false,
        },
      },
    );

    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'google',
      providerId: 'google',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'gemini-1.5-pro',
      reasoning: {
        enabled: true,
        maxTokens: 20000,
        includeThoughts: false,
      },
    });
  });

  it('throws for unsupported provider type', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue(undefined);

    expect(() =>
      ModelProviderFactory.create(
        { providerType: 'unknown', ...provider },
        { upstreamId: 'gpt-4o' },
      ),
    ).toThrow('Unsupported provider type: unknown');
  });

  it('maps preset provider type to sdk type', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('openrouter');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'router-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    const created = ModelProviderFactory.create(
      { providerType: 'zenmux', ...provider },
      { upstreamId: 'gpt-4o-mini' },
    );

    expect(mocks.resolveRuntimeChatSdkType).toHaveBeenCalledWith({
      providerId: 'zenmux',
    });
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'openrouter',
      providerId: 'zenmux',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'gpt-4o-mini',
      reasoning: undefined,
    });
    expect(created.model).toBe('router-model');
  });

  it('maps azure provider type to openai-compatible sdk type', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('openai-compatible');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'azure-compatible-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    const created = ModelProviderFactory.create(
      { providerType: 'azure', ...provider },
      { upstreamId: 'gpt-4o-mini' },
    );

    expect(mocks.resolveRuntimeChatSdkType).toHaveBeenCalledWith({
      providerId: 'azure',
    });
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'openai-compatible',
      providerId: 'azure',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'gpt-4o-mini',
      reasoning: undefined,
    });
    expect(created.model).toBe('azure-compatible-model');
  });

  it('maps vertexai provider type to google sdk type', () => {
    mocks.resolveRuntimeChatSdkType.mockReturnValue('google');
    mocks.createRuntimeChatLanguageModel.mockReturnValue({
      model: 'vertex-google-model',
      providerOptions: undefined,
      agentProviderData: undefined,
    });

    const created = ModelProviderFactory.create(
      { providerType: 'vertexai', ...provider },
      { upstreamId: 'gemini-2.5-pro' },
    );

    expect(mocks.resolveRuntimeChatSdkType).toHaveBeenCalledWith({
      providerId: 'vertexai',
    });
    expect(mocks.createRuntimeChatLanguageModel).toHaveBeenCalledWith({
      sdkType: 'google',
      providerId: 'vertexai',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com',
      modelId: 'gemini-2.5-pro',
      reasoning: undefined,
    });
    expect(created.model).toBe('vertex-google-model');
  });
});
