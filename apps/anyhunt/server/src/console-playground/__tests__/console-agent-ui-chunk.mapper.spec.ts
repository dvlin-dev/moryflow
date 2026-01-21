/**
 * [INPUT]: AgentStreamEvent 序列（包含 text/tool 边界）
 * [OUTPUT]: UIMessage parts 顺序与分段结果
 * [POS]: Console Agent SSE（UIMessageChunk）分段回归测试
 */

import { ReadableStream as NodeReadableStream } from 'stream/web';
import { describe, expect, it } from 'vitest';
import {
  isTextUIPart,
  isToolUIPart,
  readUIMessageStream,
  type UIMessage,
  type UIMessageChunk,
} from 'ai';
import type { AgentStreamEvent } from '../../agent/dto';
import {
  createConsoleAgentUiChunkMapperState,
  mapConsoleAgentEventToUiChunks,
} from '../streaming/console-agent-ui-chunk.mapper';

const createReadableStream = <T>(items: T[]): ReadableStream<T> => {
  const ReadableStreamImpl = (globalThis.ReadableStream ??
    NodeReadableStream) as typeof ReadableStream;
  return new ReadableStreamImpl({
    start(controller) {
      for (const item of items) {
        controller.enqueue(item);
      }
      controller.close();
    },
  });
};

const collectLastMessage = async (
  chunks: UIMessageChunk[],
): Promise<UIMessage> => {
  let latest: UIMessage | null = null;
  const stream = createReadableStream(chunks);
  const iterable = readUIMessageStream<UIMessage>({ stream });
  for await (const message of iterable) {
    latest = message;
  }
  if (!latest) {
    throw new Error('No UIMessage produced');
  }
  return latest;
};

describe('console-agent-ui-chunk.mapper', () => {
  it('splits assistant text into multiple parts around tool calls', async () => {
    const state = createConsoleAgentUiChunkMapperState();
    const events: AgentStreamEvent[] = [
      { type: 'textDelta', delta: 'Hello ' },
      {
        type: 'toolCall',
        toolCallId: 'call-1',
        toolName: 'browser.open',
        input: { url: 'https://example.com' },
      },
      { type: 'toolResult', toolCallId: 'call-1', output: { ok: true } },
      { type: 'textDelta', delta: 'Done' },
      { type: 'complete', data: { ok: true }, creditsUsed: 1 },
    ];

    const mappedChunks: UIMessageChunk[] = [
      { type: 'start', messageId: 'task-1' },
    ];
    for (const event of events) {
      mappedChunks.push(...mapConsoleAgentEventToUiChunks(event, state));
    }
    mappedChunks.push({ type: 'finish' });

    const message = await collectLastMessage(mappedChunks);
    const parts = message.parts ?? [];
    const textParts = parts.filter(isTextUIPart);
    const toolParts = parts.filter(isToolUIPart);

    expect(textParts).toHaveLength(2);
    expect(textParts[0]?.text).toBe('Hello ');
    expect(textParts[1]?.text).toBe('Done');

    expect(toolParts).toHaveLength(1);
    expect(toolParts[0]?.toolCallId).toBe('call-1');

    const partTypes = parts.map((part) => part.type);
    expect(partTypes[0]).toBe('text');
    expect(
      partTypes[1]?.startsWith('tool-') || partTypes[1] === 'dynamic-tool',
    ).toBe(true);
    expect(partTypes[2]).toBe('text');
  });

  it('renders complete payload as text when no output deltas streamed', async () => {
    const state = createConsoleAgentUiChunkMapperState();
    const chunks: UIMessageChunk[] = [
      { type: 'start', messageId: 'task-2' },
      ...mapConsoleAgentEventToUiChunks(
        { type: 'complete', data: { title: 'Done' }, creditsUsed: 1 },
        state,
      ),
      { type: 'finish' },
    ];

    const message = await collectLastMessage(chunks);
    const textParts = (message.parts ?? []).filter(isTextUIPart);
    expect(textParts).toHaveLength(1);
    expect(textParts[0]?.text).toContain('"title": "Done"');
  });
});
