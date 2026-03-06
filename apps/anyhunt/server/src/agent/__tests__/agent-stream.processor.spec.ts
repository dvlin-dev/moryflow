/**
 * [INPUT]: RunStreamEvent samples + mocked billing/progress services
 * [OUTPUT]: RunStreamEvent passthrough results
 * [POS]: agent-stream.processor.ts 单元测试（副作用执行 + 事件透传）
 */

import { describe, expect, it, vi } from 'vitest';
import {
  AgentStreamProcessor,
  TaskCancelledError,
} from '../agent-stream.processor';

const createMocks = () => {
  const progressStore = {
    isCancelRequested: vi.fn().mockResolvedValue(false),
    setProgress: vi.fn().mockResolvedValue(undefined),
  };

  const billingService = {
    updateBillingFromUsage: vi.fn(),
    buildProgress: vi.fn().mockImplementation((billing) => ({
      creditsUsed: billing.currentCredits,
      toolCallCount: billing.toolCallCount,
      elapsedMs: 100,
    })),
    checkCreditsLimit: vi.fn(),
    applyQuotaCheckpoint: vi.fn().mockResolvedValue(undefined),
  };

  return { progressStore, billingService };
};

describe('AgentStreamProcessor.consumeStreamEvents', () => {
  it('passes through RunStreamEvent while applying side effects', async () => {
    const { progressStore, billingService } = createMocks();
    const processor = new AgentStreamProcessor(
      progressStore as any,
      billingService as any,
    );

    const events = [
      {
        type: 'raw_model_stream_event',
        data: { type: 'output_text_delta', delta: 'hello' },
      },
      {
        type: 'run_item_stream_event',
        item: { type: 'tool_call_item', rawItem: {} },
      },
    ] as const;

    const streamResult = {
      state: { _context: { usage: { inputTokens: 10, outputTokens: 20 } } },
      async *[Symbol.asyncIterator]() {
        for (const event of events) {
          yield event as unknown;
        }
      },
    };

    const output: unknown[] = [];
    for await (const event of processor.consumeStreamEvents({
      streamResult: streamResult as any,
      billing: {
        maxCredits: undefined,
        currentCredits: 1,
        toolCallCount: 0,
        startTime: new Date(),
        chargedCredits: 0,
      },
      taskId: 'task_1',
      userId: 'user_1',
      abortController: new AbortController(),
    })) {
      output.push(event);
    }

    expect(output).toEqual(events);
    expect(progressStore.setProgress).toHaveBeenCalled();
    expect(billingService.updateBillingFromUsage).toHaveBeenCalled();
    expect(billingService.applyQuotaCheckpoint).toHaveBeenCalled();
  });

  it('throws TaskCancelledError when cancel requested', async () => {
    const { progressStore, billingService } = createMocks();
    progressStore.isCancelRequested.mockResolvedValueOnce(true);
    const processor = new AgentStreamProcessor(
      progressStore as any,
      billingService as any,
    );

    const streamResult = {
      state: { _context: { usage: { inputTokens: 0, outputTokens: 0 } } },
      async *[Symbol.asyncIterator]() {
        yield {
          type: 'raw_model_stream_event',
          data: { type: 'output_text_delta', delta: 'x' },
        } as unknown;
      },
    };

    const iterator = processor.consumeStreamEvents({
      streamResult: streamResult as any,
      billing: {
        maxCredits: undefined,
        currentCredits: 1,
        toolCallCount: 0,
        startTime: new Date(0),
        chargedCredits: 0,
      },
      taskId: 'task_2',
      userId: 'user_1',
      abortController: new AbortController(),
    });

    await expect(iterator.next()).rejects.toBeInstanceOf(TaskCancelledError);
  });
});
