/**
 * [INPUT]: UIMessage + 标准 UIMessage stream SSE 响应
 * [OUTPUT]: 请求体构造与 stream 解析结果
 * [POS]: AgentChatTransport 单元测试（官方协议）
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
  it('sends official request body and parses official UIMessage stream chunks', async () => {
    const stream = buildSseStream([
      { type: 'start', messageId: 'msg_1' },
      { type: 'text-start', id: 'text_1' },
      { type: 'text-delta', id: 'text_1', delta: 'Hello' },
      { type: 'text-end', id: 'text_1' },
      { type: 'finish', finishReason: 'stop' },
    ]);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const optionsRef = {
        current: { apiKey: 'key-1', output: { type: 'text' }, modelId: 'gpt-4o' },
      };
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
      const headers = new Headers(requestInit?.headers as HeadersInit | undefined);
      expect(headers.get('authorization')).toBe('Bearer key-1');

      const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;
      expect(body).toMatchObject({
        model: 'gpt-4o',
        output: { type: 'text' },
        stream: true,
      });
      expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);

      const reader = resultStream.getReader();
      const chunks: UIMessageChunk[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks).toEqual([
        { type: 'start', messageId: 'msg_1' },
        { type: 'text-start', id: 'text_1' },
        { type: 'text-delta', id: 'text_1', delta: 'Hello' },
        { type: 'text-end', id: 'text_1' },
        { type: 'finish', finishReason: 'stop' },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not drain successful SSE responses for thinking level requests', async () => {
    const stream = buildSseStream([
      { type: 'start', messageId: 'msg_1' },
      { type: 'finish', finishReason: 'stop' },
    ]);
    const response = new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
    const cloneSpy = vi.spyOn(response, 'clone');
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);

    try {
      const optionsRef = {
        current: {
          apiKey: 'key-1',
          output: { type: 'text' as const },
          modelId: 'gpt-4o',
          thinking: { mode: 'level' as const, level: 'high' },
        },
      };
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
      const reader = resultStream.getReader();
      await reader.read();

      expect(cloneSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('throws when prompt is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    try {
      const optionsRef = { current: { apiKey: 'key-1', output: { type: 'text' } } };
      const transport = new AgentChatTransport(optionsRef);

      const messages: UIMessage[] = [
        {
          id: 'u1',
          role: 'user',
          parts: [{ type: 'reasoning', text: 'no text' }],
        },
      ];

      await expect(
        transport.sendMessages({
          chatId: 'chat-1',
          messages,
          trigger: 'submit-message',
          abortSignal: undefined,
        })
      ).rejects.toThrow('Prompt is empty');
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('retries once with thinking off when server returns thinking 400', async () => {
    const stream = buildSseStream([
      { type: 'start', messageId: 'msg_1' },
      { type: 'finish', finishReason: 'stop' },
    ]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 400,
            code: 'THINKING_LEVEL_INVALID',
            detail: "Invalid thinking level 'high'",
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/problem+json' },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const onThinkingAutoDowngrade = vi.fn();
      const optionsRef = {
        current: {
          apiKey: 'key-1',
          output: { type: 'text' },
          modelId: 'gpt-4o',
          thinking: { mode: 'level' as const, level: 'high' },
        },
      };
      const transport = new AgentChatTransport(optionsRef, {
        onThinkingAutoDowngrade,
      });

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
      await reader.read();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, retryInit] = fetchMock.mock.calls[1] ?? [];
      const retryBody = JSON.parse(String(retryInit?.body)) as Record<string, unknown>;
      expect(retryBody.thinking).toEqual({ mode: 'off' });
      expect(onThinkingAutoDowngrade).toHaveBeenCalledWith('gpt-4o');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not retry when 400 code is unrelated', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 400,
          code: 'VALIDATION_ERROR',
          detail: 'Validation failed',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/problem+json' },
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const optionsRef = {
        current: {
          apiKey: 'key-1',
          output: { type: 'text' },
          modelId: 'gpt-4o',
          thinking: { mode: 'level' as const, level: 'high' },
        },
      };
      const transport = new AgentChatTransport(optionsRef);

      const messages: UIMessage[] = [
        {
          id: 'u1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      ];

      await expect(
        transport.sendMessages({
          chatId: 'chat-1',
          messages,
          trigger: 'submit-message',
          abortSignal: undefined,
        })
      ).rejects.toThrow();

      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
