import { describe, expect, it } from 'vitest';
import { RunRawModelStreamEvent, type RunStreamEvent } from '@openai/agents-core';
import type { UIMessage, UIMessageChunk, UIMessageStreamWriter } from 'ai';

import type { AgentStreamResult } from '../../agent-runtime/index.js';
import { streamAgentRun } from '../messages.js';

const createResult = (events: RunStreamEvent[]): AgentStreamResult => {
  const stream = {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  };

  return Object.assign(stream, {
    completed: Promise.resolve(),
    state: {} as AgentStreamResult['state'],
    output: [],
  }) as AgentStreamResult;
};

const createRunItemReasoningEvent = (text: string): RunStreamEvent =>
  ({
    type: 'run_item_stream_event',
    name: 'reasoning_item_created',
    item: {
      type: 'reasoning_item',
      rawItem: {
        content: [{ type: 'reasoning_text', text }],
      },
    },
  }) as RunStreamEvent;

describe('streamAgentRun', () => {
  it('emits start and finish chunks for persistence', async () => {
    const events = [
      new RunRawModelStreamEvent({ type: 'output_text_delta', delta: 'Hello' }),
      new RunRawModelStreamEvent({
        type: 'response_done',
        response: { usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } },
      }),
    ];

    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };

    await streamAgentRun({ writer, result: createResult(events) });

    expect(chunks[0]?.type).toBe('start');
    expect(chunks.filter((chunk) => chunk.type === 'start')).toHaveLength(1);
    expect(chunks.some((chunk) => chunk.type === 'text-start')).toBe(true);
    expect(chunks.some((chunk) => chunk.type === 'finish')).toBe(true);
  });

  it('does not emit reasoning chunk when thinking is requested but raw model returns no reasoning', async () => {
    const events = [
      new RunRawModelStreamEvent({ type: 'output_text_delta', delta: 'Hello' }),
      new RunRawModelStreamEvent({ type: 'response_done', response: {} }),
    ];

    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };

    await streamAgentRun({
      writer,
      result: createResult(events),
      thinkingContext: {
        requested: { mode: 'level', level: 'medium' },
        resolvedLevel: 'medium',
        downgradedToOff: false,
      },
    });

    const reasoningChunks = chunks.filter((chunk) => chunk.type === 'reasoning-delta');
    expect(reasoningChunks).toHaveLength(0);
  });

  it('renders raw reasoning only when both raw stream and run-item carry reasoning', async () => {
    const events = [
      createRunItemReasoningEvent('run-item-reasoning'),
      new RunRawModelStreamEvent({ type: 'reasoning-delta', delta: 'raw-reasoning' }),
      new RunRawModelStreamEvent({ type: 'output_text_delta', delta: 'Hello' }),
      new RunRawModelStreamEvent({ type: 'response_done', response: {} }),
    ];

    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };

    await streamAgentRun({ writer, result: createResult(events) });

    const reasoningChunks = chunks.filter((chunk) => chunk.type === 'reasoning-delta');
    expect(reasoningChunks).toHaveLength(1);
    expect(reasoningChunks[0]?.delta).toBe('raw-reasoning');
  });

  it('does not render reasoning when only run-item reasoning is returned', async () => {
    const events = [
      createRunItemReasoningEvent('run-item-reasoning'),
      new RunRawModelStreamEvent({ type: 'output_text_delta', delta: 'Hello' }),
      new RunRawModelStreamEvent({ type: 'response_done', response: {} }),
    ];

    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };

    await streamAgentRun({ writer, result: createResult(events) });

    const reasoningChunks = chunks.filter((chunk) => chunk.type === 'reasoning-delta');
    expect(reasoningChunks).toHaveLength(0);
  });
});
