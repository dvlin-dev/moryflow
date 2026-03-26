import { describe, expect, it } from 'vitest';
import { RunRawModelStreamEvent, type RunStreamEvent } from '@openai/agents-core';
import type { UIMessage, UIMessageChunk, UIMessageStreamWriter } from 'ai';
import type { ToolRuntimeStreamEvent } from '@moryflow/agents-runtime';

import type { AgentStreamResult } from '../../agent-runtime/index.js';
import { streamAgentRun } from '../../stream/streamAgentRun.js';

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

const createDelayedIterable = <T>(events: Array<{ delayMs?: number; event: T }>) => ({
  async *[Symbol.asyncIterator]() {
    for (const { delayMs = 0, event } of events) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      yield event;
    }
  },
});

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
  it('calls onFirstRenderableAssistantChunk only when assistant content becomes visible', async () => {
    const events = [new RunRawModelStreamEvent({ type: 'response_done', response: {} })];
    const chunks: UIMessageChunk[] = [];
    const firstRenderableChunkTypes: string[] = [];
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
      onFirstRenderableAssistantChunk: (chunk) => {
        firstRenderableChunkTypes.push(chunk.type);
      },
    });

    expect(chunks.map((chunk) => chunk.type)).toEqual(['start', 'finish']);
    expect(firstRenderableChunkTypes).toEqual([]);
  });

  it('calls onFirstRenderableAssistantChunk once for the first visible assistant chunk', async () => {
    const events = [
      createRunItemReasoningEvent('run-item-reasoning'),
      new RunRawModelStreamEvent({
        type: 'model',
        event: { type: 'reasoning-delta', delta: 'raw-reasoning' },
      }),
      new RunRawModelStreamEvent({ type: 'output_text_delta', delta: 'Hello' }),
      new RunRawModelStreamEvent({ type: 'response_done', response: {} }),
    ];
    const firstRenderableChunkTypes: string[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: () => {},
      merge: () => {},
      onError: undefined,
    };

    await streamAgentRun({
      writer,
      result: createResult(events),
      onFirstRenderableAssistantChunk: (chunk) => {
        firstRenderableChunkTypes.push(chunk.type);
      },
    });

    expect(firstRenderableChunkTypes).toEqual(['reasoning-start']);
  });

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
      new RunRawModelStreamEvent({
        type: 'model',
        event: { type: 'reasoning-delta', delta: 'raw-reasoning' },
      }),
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

  it('ignores top-level reasoning-delta because canonical reasoning comes from model.event', async () => {
    const events = [
      new RunRawModelStreamEvent({ type: 'reasoning-delta', delta: 'top-level-reasoning' }),
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

  it('ignores reasoning text embedded in response_done to avoid duplicate fallback rendering', async () => {
    const events = [
      new RunRawModelStreamEvent({ type: 'output_text_delta', delta: 'Hello' }),
      new RunRawModelStreamEvent({
        type: 'response_done',
        response: {
          output: [
            {
              type: 'reasoning',
              content: [{ type: 'reasoning_text', text: 'summary-reasoning' }],
            },
          ],
        },
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

  it('propagates finishReason from model.finish metadata for truncation auto-continue', async () => {
    const events = [
      new RunRawModelStreamEvent({
        type: 'model',
        event: { type: 'finish', finishReason: { unified: 'length', raw: 'max_tokens' } },
      }),
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

    const result = await streamAgentRun({ writer, result: createResult(events) });

    const finishChunk = chunks.find((chunk) => chunk.type === 'finish');
    expect(finishChunk?.type).toBe('finish');
    expect(finishChunk?.finishReason).toBe('length');
    expect(result.finishReason).toBe('length');
  });

  it('emits preliminary tool previews before final sdk tool output arrives', async () => {
    const events: RunStreamEvent[] = [
      {
        type: 'run_item_stream_event',
        name: 'tool_called',
        item: {
          type: 'tool_call_item',
          rawItem: {
            callId: 'call-1',
            name: 'bash',
            arguments: '{"command":"pwd"}',
          },
        },
      } as RunStreamEvent,
      {
        type: 'run_item_stream_event',
        name: 'tool_output',
        item: {
          type: 'tool_call_output_item',
          rawItem: {
            id: 'call-1',
            name: 'bash',
          },
          output: {
            stdout: '/tmp\n',
            stderr: '',
            exitCode: 0,
          },
        },
      } as RunStreamEvent,
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

    const toolRuntimeEvents = createDelayedIterable<ToolRuntimeStreamEvent>([
      {
        delayMs: 10,
        event: {
          kind: 'progress',
          toolCallId: 'call-1',
          toolName: 'bash',
          message: 'pwd',
          startedAt: 100,
          timestamp: 120,
        },
      },
      {
        delayMs: 10,
        event: {
          kind: 'stdout',
          toolCallId: 'call-1',
          toolName: 'bash',
          chunk: '/tmp\n',
          startedAt: 100,
          timestamp: 140,
        },
      },
    ]);

    const result = Object.assign(
      createDelayedIterable(
        events.map((event, index) => ({ delayMs: index === 0 ? 0 : 40, event }))
      ),
      {
        completed: Promise.resolve(),
        state: {} as AgentStreamResult['state'],
        output: [],
      }
    ) as AgentStreamResult;

    await streamAgentRun({
      writer,
      result,
      toolRuntimeEvents,
    });

    expect(
      chunks.some(
        (chunk) =>
          chunk.type === 'tool-output-available' &&
          chunk.toolCallId === 'call-1' &&
          chunk.preliminary === true
      )
    ).toBe(true);
    expect(
      chunks.some(
        (chunk) =>
          chunk.type === 'tool-output-available' &&
          chunk.toolCallId === 'call-1' &&
          chunk.preliminary !== true &&
          typeof (chunk.output as { stdout?: string }).stdout === 'string'
      )
    ).toBe(true);
  });

  it('finalizes running tool previews as interrupted when the run is aborted', async () => {
    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };
    const controller = new AbortController();

    const result = Object.assign(
      createDelayedIterable<RunStreamEvent>([
        {
          event: {
            type: 'run_item_stream_event',
            name: 'tool_called',
            item: {
              type: 'tool_call_item',
              rawItem: {
                callId: 'call-2',
                name: 'bash',
                arguments: '{"command":"sleep 10"}',
              },
            },
          } as RunStreamEvent,
        },
        {
          delayMs: 80,
          event: new RunRawModelStreamEvent({ type: 'response_done', response: {} }),
        },
      ]),
      {
        completed: Promise.resolve(),
        state: {} as AgentStreamResult['state'],
        output: [],
      }
    ) as AgentStreamResult;

    const toolRuntimeEvents = createDelayedIterable<ToolRuntimeStreamEvent>([
      {
        delayMs: 10,
        event: {
          kind: 'progress',
          toolCallId: 'call-2',
          toolName: 'bash',
          message: 'sleep 10',
          startedAt: 100,
          timestamp: 120,
        },
      },
    ]);

    setTimeout(() => controller.abort(), 30);

    await streamAgentRun({
      writer,
      result,
      signal: controller.signal,
      toolRuntimeEvents,
    });

    expect(
      chunks.some(
        (chunk) =>
          chunk.type === 'tool-output-available' &&
          chunk.toolCallId === 'call-2' &&
          chunk.preliminary !== true &&
          (chunk.output as { kind?: string; status?: string }).kind === 'streaming_preview' &&
          (chunk.output as { status?: string }).status === 'interrupted'
      )
    ).toBe(true);
  });

  it('finalizes known tools as interrupted on abort even when no runtime preview was emitted', async () => {
    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };
    const controller = new AbortController();

    const result = Object.assign(
      createDelayedIterable<RunStreamEvent>([
        {
          event: {
            type: 'run_item_stream_event',
            name: 'tool_called',
            item: {
              type: 'tool_call_item',
              rawItem: {
                callId: 'call-3',
                name: 'web_fetch',
                arguments: '{"url":"https://example.com"}',
              },
            },
          } as RunStreamEvent,
        },
        {
          delayMs: 80,
          event: new RunRawModelStreamEvent({ type: 'response_done', response: {} }),
        },
      ]),
      {
        completed: Promise.resolve(),
        state: {} as AgentStreamResult['state'],
        output: [],
      }
    ) as AgentStreamResult;

    setTimeout(() => controller.abort(), 30);

    await streamAgentRun({
      writer,
      result,
      signal: controller.signal,
    });

    expect(
      chunks.some(
        (chunk) =>
          chunk.type === 'tool-output-available' &&
          chunk.toolCallId === 'call-3' &&
          chunk.preliminary !== true &&
          (chunk.output as { kind?: string; status?: string }).kind === 'streaming_preview' &&
          (chunk.output as { status?: string }).status === 'interrupted'
      )
    ).toBe(true);
  });

  it('synthesizes tool input and interrupted terminal output for pending runtime events aborted before tool_called', async () => {
    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };
    const controller = new AbortController();

    const result = Object.assign(
      createDelayedIterable<RunStreamEvent>([
        {
          delayMs: 80,
          event: {
            type: 'run_item_stream_event',
            name: 'tool_called',
            item: {
              type: 'tool_call_item',
              rawItem: {
                callId: 'call-4',
                name: 'bash',
                arguments: '{"command":"sleep 10"}',
              },
            },
          } as RunStreamEvent,
        },
      ]),
      {
        completed: Promise.resolve(),
        state: {} as AgentStreamResult['state'],
        output: [],
      }
    ) as AgentStreamResult;

    const toolRuntimeEvents = createDelayedIterable<ToolRuntimeStreamEvent>([
      {
        delayMs: 10,
        event: {
          kind: 'progress',
          toolCallId: 'call-4',
          toolName: 'bash',
          message: 'sleep 10',
          startedAt: 100,
          timestamp: 120,
        },
      },
    ]);

    setTimeout(() => controller.abort(), 30);

    await streamAgentRun({
      writer,
      result,
      signal: controller.signal,
      toolRuntimeEvents,
    });

    expect(
      chunks.some(
        (chunk) =>
          chunk.type === 'tool-input-available' &&
          chunk.toolCallId === 'call-4' &&
          chunk.toolName === 'bash'
      )
    ).toBe(true);
    expect(
      chunks.some(
        (chunk) =>
          chunk.type === 'tool-output-available' &&
          chunk.toolCallId === 'call-4' &&
          chunk.preliminary !== true &&
          (chunk.output as { kind?: string; status?: string }).kind === 'streaming_preview' &&
          (chunk.output as { status?: string }).status === 'interrupted'
      )
    ).toBe(true);
  });

  it('flushes buffered runtime preview before emitting interrupted terminal output on abort', async () => {
    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };
    const controller = new AbortController();

    const result = Object.assign(
      createDelayedIterable<RunStreamEvent>([
        {
          delayMs: 80,
          event: {
            type: 'run_item_stream_event',
            name: 'tool_called',
            item: {
              type: 'tool_call_item',
              rawItem: {
                callId: 'call-5',
                name: 'bash',
                arguments: '{"command":"sleep 10"}',
              },
            },
          } as RunStreamEvent,
        },
      ]),
      {
        completed: Promise.resolve(),
        state: {} as AgentStreamResult['state'],
        output: [],
      }
    ) as AgentStreamResult;

    const toolRuntimeEvents = createDelayedIterable<ToolRuntimeStreamEvent>([
      {
        delayMs: 10,
        event: {
          kind: 'progress',
          toolCallId: 'call-5',
          toolName: 'bash',
          message: 'sleep 10',
          startedAt: 100,
          timestamp: 120,
        },
      },
      {
        delayMs: 10,
        event: {
          kind: 'stdout',
          toolCallId: 'call-5',
          toolName: 'bash',
          chunk: 'step 1\n',
          startedAt: 100,
          timestamp: 140,
        },
      },
    ]);

    setTimeout(() => controller.abort(), 35);

    await streamAgentRun({
      writer,
      result,
      signal: controller.signal,
      toolRuntimeEvents,
    });

    const previewChunks = chunks.filter(
      (chunk): chunk is Extract<UIMessageChunk, { type: 'tool-output-available' }> =>
        chunk.type === 'tool-output-available' && chunk.toolCallId === 'call-5'
    );
    const terminalPreview = previewChunks.at(-1);

    expect(previewChunks.some((chunk) => chunk.preliminary === true)).toBe(true);
    expect(terminalPreview?.preliminary).not.toBe(true);
    expect(
      (
        terminalPreview?.output as {
          kind?: string;
          status?: string;
          summary?: string;
          stdoutPreview?: string;
        }
      )?.kind
    ).toBe('streaming_preview');
    expect(
      (
        terminalPreview?.output as {
          status?: string;
          stdoutPreview?: string;
        }
      )?.status
    ).toBe('interrupted');
    expect(
      (
        terminalPreview?.output as {
          stdoutPreview?: string;
        }
      )?.stdoutPreview
    ).toContain('step 1\n');
  });

  it('does not emit finish when result.completed rejects after partial output', async () => {
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
    const result = Object.assign(createResult(events), {
      completed: Promise.reject(new Error('settlement failed')),
    }) as AgentStreamResult;

    await expect(streamAgentRun({ writer, result })).rejects.toThrow('settlement failed');

    expect(chunks.some((chunk) => chunk.type === 'text-delta')).toBe(true);
    expect(chunks.some((chunk) => chunk.type === 'text-end')).toBe(true);
    expect(chunks.some((chunk) => chunk.type === 'finish')).toBe(false);
  });

  it('keeps partial content when the event stream throws before completion', async () => {
    const chunks: UIMessageChunk[] = [];
    const writer: UIMessageStreamWriter<UIMessage> = {
      write: (part) => {
        chunks.push(part);
      },
      merge: () => {},
      onError: undefined,
    };
    const result = Object.assign(
      {
        async *[Symbol.asyncIterator]() {
          yield new RunRawModelStreamEvent({ type: 'output_text_delta', delta: 'Partial' });
          throw new Error('stream failed');
        },
      },
      {
        completed: Promise.resolve(),
        state: {} as AgentStreamResult['state'],
        output: [],
      }
    ) as AgentStreamResult;

    await expect(streamAgentRun({ writer, result })).rejects.toThrow('stream failed');

    expect(chunks.some((chunk) => chunk.type === 'text-delta')).toBe(true);
    expect(chunks.some((chunk) => chunk.type === 'text-end')).toBe(true);
    expect(chunks.some((chunk) => chunk.type === 'finish')).toBe(false);
  });
});
