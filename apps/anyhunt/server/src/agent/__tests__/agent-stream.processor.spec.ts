/**
 * [INPUT]: RunStreamEvent samples
 * [OUTPUT]: AgentStreamEvent mapping results
 * [POS]: agent-stream.processor.ts 单元测试（确保 toolCallId 稳定、字段 camelCase）
 */

import { describe, expect, it } from 'vitest';
import { AgentStreamProcessor } from '../agent-stream.processor';

const createProcessor = () => new AgentStreamProcessor({} as any, {} as any);

describe('AgentStreamProcessor.convertRunEventToSSE', () => {
  it('maps output_text_delta to textDelta', () => {
    const processor = createProcessor();

    const result = processor.convertRunEventToSSE({
      type: 'raw_model_stream_event',
      data: { type: 'output_text_delta', delta: 'Hello' },
    } as any);

    expect(result).toEqual({ type: 'textDelta', delta: 'Hello' });
  });

  it('maps reasoning-delta to reasoningDelta', () => {
    const processor = createProcessor();

    const result = processor.convertRunEventToSSE({
      type: 'raw_model_stream_event',
      data: {
        type: 'model',
        event: { type: 'reasoning-delta', delta: 'Thinking...' },
      },
    } as any);

    expect(result).toEqual({ type: 'reasoningDelta', delta: 'Thinking...' });
  });

  it('maps tool_call_item to toolCall and parses arguments', () => {
    const processor = createProcessor();

    const result = processor.convertRunEventToSSE({
      type: 'run_item_stream_event',
      item: {
        type: 'tool_call_item',
        rawItem: {
          type: 'function_call',
          callId: 'call-1',
          name: 'browser_open',
          arguments: '{"interactive":true}',
        },
      },
    } as any);

    expect(result).toEqual({
      type: 'toolCall',
      toolCallId: 'call-1',
      toolName: 'browser_open',
      input: { interactive: true },
    });
  });

  it('maps tool_call_output_item to toolResult and parses output', () => {
    const processor = createProcessor();

    const result = processor.convertRunEventToSSE({
      type: 'run_item_stream_event',
      item: {
        type: 'tool_call_output_item',
        rawItem: {
          type: 'function_call_result',
          callId: 'call-2',
          name: 'browser_snapshot',
          output: '{"ok":true}',
        },
      },
    } as any);

    expect(result).toEqual({
      type: 'toolResult',
      toolCallId: 'call-2',
      toolName: 'browser_snapshot',
      output: { ok: true },
      errorText: undefined,
    });
  });

  it('falls back to rawItem.id when callId is missing', () => {
    const processor = createProcessor();

    const result = processor.convertRunEventToSSE({
      type: 'run_item_stream_event',
      item: {
        type: 'tool_call_item',
        rawItem: {
          id: 'fallback-id',
          name: 'browser_open',
          arguments: '{}',
        },
      },
    } as any) as any;

    expect(result.toolCallId).toBe('fallback-id');
  });
});
