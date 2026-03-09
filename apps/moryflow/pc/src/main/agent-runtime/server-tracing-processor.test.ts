/* @vitest-environment node */

import { describe, expect, it } from 'vitest';

import { ServerTracingProcessor } from './server-tracing-processor.js';

const createProcessor = () =>
  new ServerTracingProcessor({
    onBatchReady: async () => undefined,
  });

describe('ServerTracingProcessor metadata normalization', () => {
  it('normalizes aliases and fills core review fields', async () => {
    const payloads: Array<{ traces: Array<{ metadata?: Record<string, unknown> | undefined }> }> =
      [];
    const processor = new ServerTracingProcessor({
      onBatchReady: async (payload) => {
        payloads.push(payload as never);
      },
    });

    await processor.onTraceStart({
      traceId: 'trace-1',
      name: 'General',
      groupId: 'group-1',
      metadata: {
        runtime: {
          mode: 'full_access',
        },
        model: 'gpt-5',
        permission: {
          decision: 'ask',
          targets: ['fs:/external/docs/a.md'],
          toolName: 'read',
        },
        doom_loop: {
          triggered: true,
        },
      },
    } as never);

    await processor.onTraceEnd({
      traceId: 'trace-1',
    } as never);

    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.traces[0]?.metadata).toMatchObject({
      platform: 'pc',
      mode: 'full_access',
      modelId: 'gpt-5',
      approval: {
        requested: true,
        target: 'fs:/external/docs/a.md',
        toolName: 'read',
      },
      doomLoop: {
        triggered: true,
      },
    });
    expect(payloads[0]?.traces[0]?.metadata).not.toHaveProperty('runtime');
    expect(payloads[0]?.traces[0]?.metadata).not.toHaveProperty('permission');
    expect(payloads[0]?.traces[0]?.metadata).not.toHaveProperty('doom_loop');
    expect(payloads[0]?.traces[0]?.metadata).not.toHaveProperty('model');
  });

  it('derives modelId from generation span when trace metadata omits it', async () => {
    const payloads: Array<{ traces: Array<{ metadata?: Record<string, unknown> | undefined }> }> =
      [];
    const processor = new ServerTracingProcessor({
      onBatchReady: async (payload) => {
        payloads.push(payload as never);
      },
    });

    await processor.onTraceStart({
      traceId: 'trace-2',
      name: 'Writer',
      metadata: {
        mode: 'ask',
      },
    } as never);

    await processor.onSpanEnd({
      traceId: 'trace-2',
      spanId: 'span-1',
      parentId: undefined,
      startedAt: '2026-03-09T10:00:00.000Z',
      endedAt: '2026-03-09T10:00:02.000Z',
      error: null,
      spanData: {
        type: 'generation',
        model: 'gpt-5-mini',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      },
    } as never);

    await processor.onTraceEnd({
      traceId: 'trace-2',
    } as never);

    expect(payloads[0]?.traces[0]?.metadata).toMatchObject({
      platform: 'pc',
      mode: 'ask',
      modelId: 'gpt-5-mini',
    });
  });

  it('preserves compaction marker shape when already present', async () => {
    const payloads: Array<{ traces: Array<{ metadata?: Record<string, unknown> | undefined }> }> =
      [];
    const processor = new ServerTracingProcessor({
      onBatchReady: async (payload) => {
        payloads.push(payload as never);
      },
    });

    await processor.onTraceStart({
      traceId: 'trace-3',
      name: 'Writer',
      metadata: {
        compaction: {
          triggered: true,
          summaryApplied: true,
          beforeTokens: 1200,
          afterTokens: 400,
        },
      },
    } as never);

    await processor.onTraceEnd({
      traceId: 'trace-3',
    } as never);

    expect(payloads[0]?.traces[0]?.metadata).toMatchObject({
      platform: 'pc',
      compaction: {
        triggered: true,
        summaryApplied: true,
        beforeTokens: 1200,
        afterTokens: 400,
      },
    });
  });

  it('keeps generated payload deterministic when metadata is empty', async () => {
    const payloads: Array<{ traces: Array<{ metadata?: Record<string, unknown> | undefined }> }> =
      [];
    const processor = new ServerTracingProcessor({
      onBatchReady: async (payload) => {
        payloads.push(payload as never);
      },
    });
    await processor.onTraceStart({
      traceId: 'trace-4',
      name: 'Writer',
    } as never);

    await expect(
      processor.onTraceEnd({
        traceId: 'trace-4',
      } as never)
    ).resolves.toBeUndefined();
    expect(payloads[0]?.traces[0]?.metadata).toBeUndefined();
  });
});
