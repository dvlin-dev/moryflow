import { describe, expect, it } from 'vitest';
import * as aiSdkModule from '../../../../node_modules/@openai/agents-extensions/dist/ai-sdk/index.js';

const { itemsToLanguageV2Messages } = aiSdkModule as unknown as {
  itemsToLanguageV2Messages: (
    model: unknown,
    items: unknown,
    settings: unknown
  ) => Array<Record<string, unknown>>;
};

describe('agents-extensions reasoning/tool-call compatibility', () => {
  const model = {
    provider: 'openai-compatible',
    modelId: 'moonshotai/kimi-k2.5',
    specificationVersion: 'v3',
  } as const;

  const items = [
    {
      type: 'reasoning',
      content: [{ text: 'internal reasoning' }],
      providerData: {},
    },
    {
      type: 'function_call',
      callId: 'call_1',
      name: 'search',
      arguments: '{"q":"hello"}',
      providerData: {},
    },
  ] as const;

  it('keeps reasoning and tool-call split without the explicit override', () => {
    const messages = itemsToLanguageV2Messages(
      model as any,
      items as any,
      {
        providerData: {},
      } as any
    );

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'reasoning', text: 'internal reasoning' }],
    });
    expect(messages[1]).toMatchObject({
      role: 'assistant',
      content: [{ type: 'tool-call', toolCallId: 'call_1', toolName: 'search' }],
    });
  });

  it('merges reasoning into the assistant tool-call message when override is enabled', () => {
    const messages = itemsToLanguageV2Messages(
      model as any,
      items as any,
      {
        providerData: {
          providerOptions: {
            reasoningContentToolCalls: true,
          },
        },
      } as any
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      role: 'assistant',
      content: [
        { type: 'reasoning', text: 'internal reasoning' },
        { type: 'tool-call', toolCallId: 'call_1', toolName: 'search' },
      ],
    });
  });
});
