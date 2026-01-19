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
  it('maps tool_call events to tool input chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'tool_call',
      callId: 'call-1',
      tool: 'browser.open',
      args: { url: 'https://example.com' },
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'text-start', id: messageId });
    expect(chunks[1]).toEqual({
      type: 'tool-input-available',
      toolCallId: 'call-1',
      toolName: 'browser.open',
      input: { url: 'https://example.com' },
    });
  });

  it('maps tool_result events to tool output chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'tool_result',
      callId: 'call-2',
      tool: 'browser.snapshot',
      result: { ok: true },
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'text-start', id: messageId });
    expect(chunks[1]).toEqual({
      type: 'tool-output-available',
      toolCallId: 'call-2',
      output: { ok: true },
    });
  });

  it('maps complete events to text chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'complete',
      data: { title: 'Done' },
      creditsUsed: 12,
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'text-start', id: messageId });
    expect(chunks[1]).toMatchObject({ type: 'text-delta', id: messageId });
    expect(chunks[2]).toEqual({ type: 'text-end', id: messageId });
  });

  it('maps thinking events to reasoning chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'thinking',
      content: 'Analyzing the page structure.',
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'reasoning-start', id: `${messageId}-reasoning` });
    expect(chunks[1]).toEqual({
      type: 'reasoning-delta',
      id: `${messageId}-reasoning`,
      delta: 'Analyzing the page structure.',
    });
  });

  it('maps progress events to reasoning chunks', () => {
    const state = createAgentEventState(messageId);
    const event: AgentStreamEvent = {
      type: 'progress',
      message: 'Opening target URL',
      step: 1,
      totalSteps: 3,
    };

    const chunks = mapAgentEventToChunks(event, state);

    expect(chunks[0]).toEqual({ type: 'reasoning-start', id: `${messageId}-reasoning` });
    expect(chunks[1]).toEqual({
      type: 'reasoning-delta',
      id: `${messageId}-reasoning`,
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

    expect(chunks[0]).toEqual({ type: 'text-start', id: messageId });
    expect(chunks[1]).toMatchObject({ type: 'text-delta', id: messageId });
    expect(chunks[2]).toEqual({ type: 'text-end', id: messageId });
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
