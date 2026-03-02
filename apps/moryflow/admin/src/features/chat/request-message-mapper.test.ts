import { describe, expect, it } from 'vitest';
import type { ChatMessage } from './store';
import { mapToChatCompletionMessages, serializeMessageTextContent } from './request-message-mapper';

const buildMessage = (input: Partial<ChatMessage>): ChatMessage =>
  ({
    id: input.id ?? 'message-1',
    role: input.role ?? 'assistant',
    parts: input.parts ?? [],
  }) as ChatMessage;

describe('serializeMessageTextContent', () => {
  it('serializes text parts and trims surrounding spaces', () => {
    const content = serializeMessageTextContent(
      buildMessage({
        role: 'user',
        parts: [{ type: 'text', text: '  hello  ' }],
      })
    );

    expect(content).toBe('hello');
  });
});

describe('mapToChatCompletionMessages', () => {
  it('maps user/assistant text messages', () => {
    const messages = mapToChatCompletionMessages([
      buildMessage({ role: 'user', parts: [{ type: 'text', text: 'question' }] }),
      buildMessage({ role: 'assistant', parts: [{ type: 'text', text: 'answer' }] }),
    ]);

    expect(messages).toEqual([
      { role: 'user', content: 'question' },
      { role: 'assistant', content: 'answer' },
    ]);
  });

  it('filters empty assistant placeholder and non-text-only messages', () => {
    const messages = mapToChatCompletionMessages([
      buildMessage({ id: 'a-1', role: 'assistant', parts: [] }),
      buildMessage({
        id: 'a-2',
        role: 'assistant',
        parts: [{ type: 'tool-search', state: 'output-available', output: { ok: true } } as never],
      }),
      buildMessage({ id: 'u-1', role: 'user', parts: [{ type: 'text', text: 'keep me' }] }),
    ]);

    expect(messages).toEqual([{ role: 'user', content: 'keep me' }]);
  });
});
