import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '../src/openaiProvider';
import { OpenAIResponsesModel } from '../src/openaiResponsesModel';
import { OpenAIChatCompletionsModel } from '../src/openaiChatCompletionsModel';
import { setOpenAIAPI } from '../src/defaults';

class FakeClient {}

describe('OpenAIProvider', () => {
  it('throws when apiKey and openAIClient are provided', () => {
    expect(() => new OpenAIProvider({ apiKey: 'k', openAIClient: {} as any })).toThrow();
  });

  it('throws when baseURL and openAIClient are provided', () => {
    expect(() => new OpenAIProvider({ baseURL: 'x', openAIClient: {} as any })).toThrow();
  });

  it('returns responses model when useResponses true', async () => {
    const provider = new OpenAIProvider({ openAIClient: new FakeClient() as any, useResponses: true });
    const model = await provider.getModel('m');
    expect(model).toBeInstanceOf(OpenAIResponsesModel);
  });

  it('uses default API when useResponses not set', async () => {
    setOpenAIAPI('responses');
    let provider = new OpenAIProvider({ openAIClient: new FakeClient() as any });
    expect(await provider.getModel('m')).toBeInstanceOf(OpenAIResponsesModel);

    setOpenAIAPI('chat_completions');
    provider = new OpenAIProvider({ openAIClient: new FakeClient() as any });
    expect(await provider.getModel('m')).toBeInstanceOf(OpenAIChatCompletionsModel);
  });
});
