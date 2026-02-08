import { describe, expect, it } from 'vitest';
import { RunRawModelStreamEvent } from '@openai/agents-core';
import type { UIMessage, UIMessageChunk, UIMessageStreamWriter } from 'ai';

import type { AgentStreamResult } from '../../agent-runtime/index.js';
import { streamAgentRun } from '../messages.js';

const createResult = (events: RunRawModelStreamEvent[]): AgentStreamResult => {
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
});
