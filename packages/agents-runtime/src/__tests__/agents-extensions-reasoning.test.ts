import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const runtimeRequire = createRequire(path.join(process.cwd(), 'package.json'));
const agentsExtensionsEntryPath = runtimeRequire.resolve('@openai/agents-extensions');
const aiSdkModulePath = path.join(path.dirname(agentsExtensionsEntryPath), 'ai-sdk', 'index.js');
const aiSdkModule = runtimeRequire(aiSdkModulePath) as typeof import('@openai/agents-extensions');

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
