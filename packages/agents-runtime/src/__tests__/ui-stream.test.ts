import { describe, expect, it } from 'vitest';
import {
  createRunModelStreamNormalizer,
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
      kind: 'text-delta',
      source: 'output_text_delta',
      deltaText: 'Hello',
      reasoningDelta: '',
      isDone: false,
    });

    expect(
      extractRunRawModelStreamEvent({
        type: 'model',
        event: { type: 'reasoning-delta', delta: 'thinking-2' },
      })
    ).toEqual({
      kind: 'reasoning-delta',
      source: 'model_event_reasoning_delta',
      deltaText: '',
      reasoningDelta: 'thinking-2',
      isDone: false,
    });
    expect(
      extractRunRawModelStreamEvent({
        type: 'reasoning-delta',
        delta: 'top-level-reasoning-should-be-ignored',
      })
    ).toEqual({
      kind: 'none',
      source: 'unknown',
      deltaText: '',
      reasoningDelta: '',
      isDone: false,
    });

    expect(
      extractRunRawModelStreamEvent({
        type: 'model',
        event: { type: 'finish', finishReason: { unified: 'length', raw: 'max_tokens' } },
      })
    ).toEqual({
      kind: 'none',
      source: 'model_event_finish',
      deltaText: '',
      reasoningDelta: '',
      isDone: false,
      finishReason: 'length',
    });

    expect(
      extractRunRawModelStreamEvent({
        type: 'response_done',
        finishReason: 'length',
        response: {
          usage: {
            input_tokens: 3,
            output_tokens: 5,
            total_tokens: 8,
          },
        },
      })
    ).toEqual({
      kind: 'done',
      source: 'response_done',
      deltaText: '',
      reasoningDelta: '',
      isDone: true,
      finishReason: 'length',
      usage: {
        promptTokens: 3,
        completionTokens: 5,
        totalTokens: 8,
      },
    });
  });

  it('文本只消费 output_text_delta，忽略 model.text-delta', () => {
    const normalizer = createRunModelStreamNormalizer();

    expect(normalizer.consume({ type: 'output_text_delta', delta: 'Hello' })).toEqual({
      kind: 'text-delta',
      source: 'output_text_delta',
      deltaText: 'Hello',
      reasoningDelta: '',
      isDone: false,
    });

    expect(
      normalizer.consume({ type: 'model', event: { type: 'text-delta', delta: 'Hello' } })
    ).toEqual({
      kind: 'none',
      source: 'unknown',
      deltaText: '',
      reasoningDelta: '',
      isDone: false,
    });
  });

  it('model.finish 仅透传 finishReason，不作为 done 事件', () => {
    const normalizer = createRunModelStreamNormalizer();

    expect(
      normalizer.consume({
        type: 'model',
        event: { type: 'finish', finishReason: { unified: 'length', raw: 'max_tokens' } },
      })
    ).toEqual({
      kind: 'none',
      source: 'model_event_finish',
      deltaText: '',
      reasoningDelta: '',
      isDone: false,
      finishReason: 'length',
    });
  });

  it('思考只消费 model.reasoning-delta，忽略顶层 reasoning-delta', () => {
    const normalizer = createRunModelStreamNormalizer();

    expect(normalizer.consume({ type: 'reasoning-delta', delta: 'top-level-think' })).toEqual({
      kind: 'none',
      source: 'unknown',
      deltaText: '',
      reasoningDelta: '',
      isDone: false,
    });

    expect(
      normalizer.consume({
        type: 'model',
        event: { type: 'reasoning-delta', delta: 'model-think' },
      })
    ).toEqual({
      kind: 'reasoning-delta',
      source: 'model_event_reasoning_delta',
      deltaText: '',
      reasoningDelta: 'model-think',
      isDone: false,
    });
  });

  it('response_done 只保留完成与 usage 语义，不注入 reasoning fallback', () => {
    expect(
      extractRunRawModelStreamEvent({
        type: 'response_done',
        response: {
          output: [
            {
              type: 'reasoning',
              content: [{ type: 'input_text', text: 'reasoning content' }],
              rawContent: [{ type: 'reasoning_text', text: 'reasoning raw' }],
            },
          ],
        },
      })
    ).toEqual({
      kind: 'done',
      source: 'response_done',
      deltaText: '',
      reasoningDelta: '',
      isDone: true,
      finishReason: undefined,
      usage: undefined,
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
