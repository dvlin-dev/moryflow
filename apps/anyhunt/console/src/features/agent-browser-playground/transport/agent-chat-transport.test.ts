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
  it('emits a start chunk before any content chunks', async () => {
    const stream = buildSseStream([
      { type: 'started', id: 'task-1', expiresAt: new Date().toISOString() },
      { type: 'complete', data: { ok: true }, creditsUsed: 1 },
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

      const startIndex = chunks.findIndex((chunk) => chunk.type === 'start');
      const textStartIndex = chunks.findIndex((chunk) => chunk.type === 'text-start');
      expect(startIndex).toBeGreaterThanOrEqual(0);
      expect(textStartIndex).toBeGreaterThan(startIndex);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
