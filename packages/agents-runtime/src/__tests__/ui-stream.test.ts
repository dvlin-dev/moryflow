import { describe, expect, it } from 'vitest';
import {
  extractRunRawModelStreamEvent,
  isRunItemStreamEvent,
  isRunRawModelStreamEvent,
  mapRunToolEventToChunk,
  resolveToolCallIdFromRawItem,
} from '../ui-stream';

describe('ui-stream', () => {
  it('识别 run item / raw model 事件', () => {
    expect(
      isRunItemStreamEvent({
        type: 'run_item_stream_event',
        name: 'tool_called',
        item: {},
      })
    ).toBe(true);

    expect(
      isRunRawModelStreamEvent({
        type: 'raw_model_stream_event',
        data: {},
      })
    ).toBe(true);
  });

  it('映射 tool_called 为 tool-input-available', () => {
    const chunk = mapRunToolEventToChunk(
      {
        type: 'run_item_stream_event',
        name: 'tool_called',
        item: {
          type: 'tool_call_item',
          rawItem: {
            callId: 'call-1',
            name: 'web_search',
            arguments: '{"query":"hello"}',
          },
        },
      },
      ['web_search']
    );

    expect(chunk).toEqual({
      type: 'tool-input-available',
      toolCallId: 'call-1',
      toolName: 'web_search',
      input: { query: 'hello' },
      providerExecuted: undefined,
      dynamic: false,
    });
  });

  it('映射 tool_output error 为 tool-output-error', () => {
    const chunk = mapRunToolEventToChunk(
      {
        type: 'run_item_stream_event',
        name: 'tool_output',
        item: {
          type: 'tool_call_output_item',
          rawItem: {
            id: 'call-2',
            name: 'browser_action',
            errorText: 'failed',
          },
          output: { ok: false },
        },
      },
      ['browser_action']
    );

    expect(chunk).toEqual({
      type: 'tool-output-error',
      toolCallId: 'call-2',
      output: { ok: false },
      errorText: 'failed',
      providerExecuted: undefined,
      dynamic: false,
    });
  });

  it('提取模型流文本/推理/完成/usage', () => {
    expect(extractRunRawModelStreamEvent({ type: 'output_text_delta', delta: 'Hello' })).toEqual({
      deltaText: 'Hello',
      reasoningDelta: '',
      isDone: false,
    });

    expect(
      extractRunRawModelStreamEvent({
        type: 'model',
        event: { type: 'reasoning-delta', delta: 'thinking' },
      })
    ).toEqual({
      deltaText: '',
      reasoningDelta: 'thinking',
      isDone: false,
    });

    expect(
      extractRunRawModelStreamEvent({
        type: 'response_done',
        response: {
          usage: {
            input_tokens: 3,
            output_tokens: 5,
            total_tokens: 8,
          },
        },
      })
    ).toEqual({
      deltaText: '',
      reasoningDelta: '',
      isDone: true,
      finishReason: 'stop',
      usage: {
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
      },
    });

    expect(
      extractRunRawModelStreamEvent({
        type: 'model',
        event: { type: 'finish', finishReason: 'length' },
      })
    ).toEqual({
      deltaText: '',
      reasoningDelta: '',
      isDone: true,
      finishReason: 'length',
    });
  });

  it('按优先级解析 toolCallId', () => {
    expect(resolveToolCallIdFromRawItem({ callId: 'from-call' })).toBe('from-call');
    expect(resolveToolCallIdFromRawItem({ id: 'from-id' })).toBe('from-id');
    expect(resolveToolCallIdFromRawItem({ providerData: { id: 'from-provider' } })).toBe(
      'from-provider'
    );
    expect(resolveToolCallIdFromRawItem({})).toMatch(/tool-call-/);
  });
});
