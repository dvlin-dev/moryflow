/**
 * [INPUT]: AgentStreamEvent samples
 * [OUTPUT]: UIMessageChunk mapping results
 * [POS]: Agent stream mapping unit tests
 */

import { describe, expect, it } from 'vitest';
import {
  createAgentEventState,
  extractPromptFromMessages,
  mapAgentEventToChunks,
} from './agent-stream';
import type { AgentStreamEvent } from './types';
import type { UIMessage } from 'ai';

const messageId = 'msg-1';

describe('agent-stream', () => {
  it('maps toolCall events to tool input chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'toolCall',
      toolCallId: 'call-1',
      toolName: 'browser.open',
      input: { url: 'https://example.com' },
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks).toEqual([
      {
        type: 'tool-input-available',
        toolCallId: 'call-1',
        toolName: 'browser.open',
        input: { url: 'https://example.com' },
      },
    ]);
  });

  it('maps toolResult events to tool output chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'toolResult',
      toolCallId: 'call-2',
      toolName: 'browser.snapshot',
      output: { ok: true },
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks).toEqual([
      {
        type: 'tool-output-available',
        toolCallId: 'call-2',
        output: { ok: true },
      },
    ]);
  });

  it('maps toolResult errors to tool output error chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'toolResult',
      toolCallId: 'call-2',
      toolName: 'browser.snapshot',
      errorText: 'No permission',
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks).toEqual([
      {
        type: 'tool-output-error',
        toolCallId: 'call-2',
        errorText: 'No permission',
      },
    ]);
  });

  it('maps complete events to text chunks when no output_text_delta streamed', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'complete',
      data: { title: 'Done' },
      creditsUsed: 12,
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'text-start', id: state.textPartId });
    expect(chunks[1]).toMatchObject({ type: 'text-delta', id: state.textPartId });
    expect(chunks[2]).toEqual({ type: 'text-end', id: state.textPartId });
  });

  it('does not append complete payload when output_text_delta already streamed', () => {
    const state = createAgentEventState(messageId);
    const deltaEvent: AgentStreamEvent = {
      type: 'textDelta',
      delta: 'Hello',
    };
    mapAgentEventToChunks(deltaEvent, state);

    const completeEvent: AgentStreamEvent = {
      type: 'complete',
      data: 'Hello',
      creditsUsed: 12,
    };

    const chunks = mapAgentEventToChunks(completeEvent, state);
    expect(chunks).toEqual([{ type: 'text-end', id: state.textPartId }]);
  });

  it('maps textDelta events to text chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'textDelta',
      delta: 'Analyzing the page structure.',
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'text-start', id: state.textPartId });
    expect(chunks[1]).toEqual({
      type: 'text-delta',
      id: state.textPartId,
      delta: 'Analyzing the page structure.',
    });
  });

  it('maps reasoningDelta events to reasoning chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'reasoningDelta',
      delta: 'Thinking...',
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'reasoning-start', id: state.reasoningPartId });
    expect(chunks[1]).toEqual({
      type: 'reasoning-delta',
      id: state.reasoningPartId,
      delta: 'Thinking...',
    });
  });

  it('maps progress events to text chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'progress',
      message: 'Opening target URL',
      step: 1,
      totalSteps: 3,
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'text-start', id: state.textPartId });
    expect(chunks[1]).toEqual({
      type: 'text-delta',
      id: state.textPartId,
      delta: 'Progress: Opening target URL · Step 1/3\n',
    });
  });

  it('maps failed events to error chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'failed',
      error: 'Something went wrong',
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'text-start', id: state.textPartId });
    expect(chunks[1]).toMatchObject({ type: 'text-delta', id: state.textPartId });
    expect(chunks[2]).toEqual({ type: 'text-end', id: state.textPartId });
    expect(chunks[3]).toEqual({ type: 'error', errorText: 'Something went wrong' });
  });

  it('extracts prompt from last user message', () => {
    const messages: UIMessage[] = [
      {
        id: '1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hello' }],
      },
      {
        id: '2',
        role: 'user',
        parts: [{ type: 'text', text: 'Summarize the page' }],
      },
    ];

    expect(extractPromptFromMessages(messages)).toBe('Summarize the page');
  });
});
