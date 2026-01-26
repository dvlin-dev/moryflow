/**
 * [INPUT]: Agent SSE events
 * [OUTPUT]: UIMessageChunk stream
 * [POS]: AgentChatTransport 单元测试
 */

import { ReadableStream as NodeReadableStream } from 'stream/web';
import { describe, expect, it, vi } from 'vitest';
import type { UIMessage, UIMessageChunk } from 'ai';
import { AgentChatTransport } from './agent-chat-transport';

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

describe('AgentChatTransport', () => {
  it('maps AgentStreamEvent payloads into UIMessageChunk stream', async () => {
    const stream = buildSseStream([
      { type: 'started', id: 'task-1' },
      { type: 'textDelta', delta: 'Hello' },
      { type: 'complete' },
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const optionsRef = { current: { apiKey: 'key-1', output: { type: 'text' } } };
      const transport = new AgentChatTransport(optionsRef);

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

      const [, requestInit] = fetchMock.mock.calls[0] ?? [];
      const headers = (requestInit?.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer key-1');

      const reader = resultStream.getReader();
      const chunks: UIMessageChunk[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks[0]).toEqual({ type: 'start', messageId: 'task-1' });
      expect(chunks[1]).toEqual({ type: 'text-start', id: 'task-1-text' });
      expect(chunks[2]).toEqual({ type: 'text-delta', id: 'task-1-text', delta: 'Hello' });
      expect(chunks[3]).toEqual({ type: 'text-end', id: 'task-1-text' });
      expect(chunks[4]).toEqual({ type: 'finish', finishReason: 'stop' });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
