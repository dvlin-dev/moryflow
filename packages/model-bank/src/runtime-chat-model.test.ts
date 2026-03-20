import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAnthropic: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  createOpenAI: vi.fn(),
  createOpenAICompatible: vi.fn(),
  createOpenRouter: vi.fn(),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: mocks.createAnthropic,
}));
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mocks.createGoogleGenerativeAI,
}));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: mocks.createOpenAI,
}));
vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: mocks.createOpenAICompatible,
}));
vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: mocks.createOpenRouter,
}));

describe('runtime-chat-model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes openai-compatible models through @ai-sdk/openai-compatible', async () => {
    const model = { specificationVersion: 'v3' };
    const compatible = vi.fn().mockReturnValue(model);
    mocks.createOpenAICompatible.mockReturnValue(compatible);

    const { createRuntimeChatLanguageModel } = await import('./runtime-chat-model');

    const result = createRuntimeChatLanguageModel({
      sdkType: 'openai-compatible',
      providerId: 'azure',
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com/v1',
      modelId: 'kimi-k2.5',
      reasoning: {
        enabled: false,
        rawConfig: {
          enableReasoning: false,
        },
      },
    });

    expect(mocks.createOpenAICompatible).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://api.example.com/v1',
      name: 'azure',
    });
    expect(compatible).toHaveBeenCalledWith('kimi-k2.5');
    expect(result.model).toBe(model);
    expect(result.providerOptions).toEqual({
      openaiCompatible: {
        enableReasoning: false,
      },
    });
    expect(result.agentProviderData).toEqual({
      openaiCompatible: {
        enableReasoning: false,
      },
      reasoningContentToolCalls: true,
    });
  });

  it('uses chat-settings providers for openai and keeps provider options aligned', async () => {
    const chat = vi.fn().mockReturnValue({ specificationVersion: 'v3' });
    mocks.createOpenAI.mockReturnValue({ chat });

    const { createRuntimeChatLanguageModel } = await import('./runtime-chat-model');

    const result = createRuntimeChatLanguageModel({
      sdkType: 'openai',
      providerId: 'openai',
      apiKey: 'sk-test',
      baseURL: 'https://api.openai.com/v1',
      modelId: 'gpt-5',
      reasoning: {
        enabled: true,
        effort: 'high',
      },
    });

    expect(chat).toHaveBeenCalledWith('gpt-5', {
      reasoningEffort: 'high',
    });
    expect(result.providerOptions).toEqual({
      openai: {
        reasoningEffort: 'high',
      },
    });
    expect(result.agentProviderData).toEqual({
      openai: {
        reasoningEffort: 'high',
      },
    });
  });
});
