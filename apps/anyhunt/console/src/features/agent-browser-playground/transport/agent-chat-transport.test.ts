/**
 * [INPUT]: Agent SSE events
 * [OUTPUT]: UIMessageChunk stream
 * [POS]: ConsoleAgentChatTransport 单元测试
 */

import { ReadableStream as NodeReadableStream } from 'stream/web';
import { describe, expect, it, vi } from 'vitest';
import type { UIMessage, UIMessageChunk } from 'ai';
import { ConsoleAgentChatTransport } from './agent-chat-transport';

const buildSseStream = (events: unknown[]) => {
  const encoder = new TextEncoder();
  const payload = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
  const ReadableStreamImpl = (globalThis.ReadableStream ??
    NodeReadableStream) as typeof ReadableStream;

  return new ReadableStreamImpl({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    },
  });
};

describe('ConsoleAgentChatTransport', () => {
  it('passes through UIMessageChunk SSE payloads', async () => {
    const stream = buildSseStream([
      { type: 'start', messageId: 'task-1' },
      { type: 'text-start', id: 'part-1' },
      { type: 'text-delta', id: 'part-1', delta: 'Hello' },
      { type: 'text-end', id: 'part-1' },
      { type: 'finish' },
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const optionsRef = { current: { apiKeyId: 'key-1', output: { type: 'text' } } };
      const transport = new ConsoleAgentChatTransport(optionsRef);

      const messages: UIMessage[] = [
        {
          id: 'u1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      ];

      const resultStream = await transport.sendMessages({
        chatId: 'chat-1',
        messages,
        trigger: 'submit-message',
        abortSignal: undefined,
      });

      const reader = resultStream.getReader();
      const chunks: UIMessageChunk[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks[0]).toEqual({ type: 'start', messageId: 'task-1' });
      expect(chunks[1]).toEqual({ type: 'text-start', id: 'part-1' });
      expect(chunks[2]).toEqual({ type: 'text-delta', id: 'part-1', delta: 'Hello' });
      expect(chunks[3]).toEqual({ type: 'text-end', id: 'part-1' });
      expect(chunks[4]).toEqual({ type: 'finish' });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
