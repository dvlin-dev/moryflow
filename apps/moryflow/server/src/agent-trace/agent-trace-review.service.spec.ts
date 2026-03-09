import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nestjs/common', () => ({
  Injectable: () => (target: unknown) => target,
}));

import { AgentTraceReviewService } from './agent-trace-review.service';
import type { PrismaService } from '../prisma/prisma.service';

type TraceRecord = {
  traceId: string;
  agentName: string;
  status: 'completed' | 'failed' | 'interrupted' | 'pending';
  totalTokens: number;
  duration: number | null;
  startedAt: Date;
  metadata: Record<string, unknown> | null;
  spans: Array<{
    traceId: string;
    spanId: string;
    type: string;
    name: string;
    status: 'success' | 'failed' | 'pending' | 'cancelled';
    duration: number | null;
  }>;
};

describe('AgentTraceReviewService', () => {
  let service: AgentTraceReviewService;
  let prisma: {
    agentTrace: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      agentTrace: {
        findMany: vi.fn(),
      },
    };

    service = new AgentTraceReviewService(prisma as unknown as PrismaService);
  });

  it('aggregates failed tools, approval hotspots, compaction and doom loop markers', async () => {
    const now = new Date('2026-03-09T10:00:00.000Z');
    prisma.agentTrace.findMany.mockResolvedValue([
      {
        traceId: 'trace-1',
        agentName: 'General',
        status: 'failed',
        totalTokens: 2400,
        duration: 9200,
        startedAt: now,
        metadata: {
          platform: 'pc',
          mode: 'ask',
          modelId: 'gpt-5',
          approval: {
            requested: true,
            target: 'fs:/external/docs/a.md',
          },
          compaction: {
            triggered: true,
          },
          doomLoop: {
            triggered: false,
          },
        },
        spans: [
          {
            traceId: 'trace-1',
            spanId: 'span-tool-1',
            type: 'function',
            name: 'read_file',
            status: 'failed',
            duration: 300,
          },
          {
            traceId: 'trace-1',
            spanId: 'span-tool-2',
            type: 'function',
            name: 'read_file',
            status: 'success',
            duration: 180,
          },
        ],
      },
      {
        traceId: 'trace-2',
        agentName: 'General',
        status: 'interrupted',
        totalTokens: 3200,
        duration: 12800,
        startedAt: now,
        metadata: {
          platform: 'pc',
          mode: 'ask',
          modelId: 'gpt-5',
          approval: {
            requested: true,
            target: 'vault:/docs/private.md',
          },
          compaction: {
            triggered: false,
          },
          doomLoop: {
            triggered: true,
          },
        },
        spans: [
          {
            traceId: 'trace-2',
            spanId: 'span-tool-3',
            type: 'function',
            name: 'search_in_file',
            status: 'success',
            duration: 220,
          },
        ],
      },
      {
        traceId: 'trace-3',
        agentName: 'Writer',
        status: 'completed',
        totalTokens: 640,
        duration: 1800,
        startedAt: now,
        metadata: {
          platform: 'mobile',
          mode: 'ask',
          modelId: 'gpt-5-mini',
          approval: {
            requested: false,
          },
          compaction: {
            triggered: false,
          },
          doomLoop: {
            triggered: false,
          },
        },
        spans: [
          {
            traceId: 'trace-3',
            spanId: 'span-tool-4',
            type: 'function',
            name: 'task',
            status: 'success',
            duration: 80,
          },
        ],
      },
    ] satisfies TraceRecord[]);

    const result = await service.getReviewSummary('user-1', {
      days: 7,
      topN: 3,
      durationThresholdMs: 9_000,
    });

    expect(prisma.agentTrace.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        startedAt: {
          gte: expect.any(Date),
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        traceId: true,
        agentName: true,
        status: true,
        totalTokens: true,
        duration: true,
        startedAt: true,
        metadata: true,
        spans: {
          select: {
            traceId: true,
            spanId: true,
            type: true,
            name: true,
            status: true,
            duration: true,
          },
        },
      },
    });

    expect(result.overview.totalTraces).toBe(3);
    expect(result.overview.failedTraces).toBe(1);
    expect(result.overview.interruptedTraces).toBe(1);
    expect(result.overview.highTokenTraceCount).toBe(2);
    expect(result.overview.longTraceCount).toBe(2);

    expect(result.failedTools[0]).toMatchObject({
      toolName: 'read_file',
      failedCount: 1,
      totalCalls: 2,
    });

    expect(result.approvalHotspots).toEqual([
      expect.objectContaining({
        target: 'fs:/external/docs/a.md',
        count: 1,
      }),
      expect.objectContaining({
        target: 'vault:/docs/private.md',
        count: 1,
      }),
    ]);

    expect(result.compaction.triggeredCount).toBe(1);
    expect(result.compaction.triggerRate).toBeCloseTo(33.33, 2);
    expect(result.doomLoop.triggeredCount).toBe(1);
    expect(result.doomLoop.triggerRate).toBeCloseTo(33.33, 2);
    expect(result.traceHotspots[0]).toMatchObject({
      traceId: 'trace-2',
      status: 'interrupted',
      totalTokens: 3200,
      duration: 12800,
    });
  });

  it('returns empty summary when no traces match the window', async () => {
    prisma.agentTrace.findMany.mockResolvedValue([]);

    const result = await service.getReviewSummary('user-1', { days: 7 });

    expect(result).toMatchObject({
      overview: {
        totalTraces: 0,
        failedTraces: 0,
        interruptedTraces: 0,
        highTokenTraceCount: 0,
        longTraceCount: 0,
      },
      failedTools: [],
      approvalHotspots: [],
      traceHotspots: [],
    });
  });

  it('uses fallback approval target when metadata only provides a tool name', async () => {
    prisma.agentTrace.findMany.mockResolvedValue([
      {
        traceId: 'trace-approval',
        agentName: 'General',
        status: 'completed',
        totalTokens: 120,
        duration: 600,
        startedAt: new Date('2026-03-09T10:00:00.000Z'),
        metadata: {
          approval: {
            requested: true,
            toolName: 'read_file',
          },
        },
        spans: [],
      },
    ] satisfies TraceRecord[]);

    const result = await service.getReviewSummary('user-1', { days: 7 });

    expect(result.approvalHotspots).toEqual([
      expect.objectContaining({
        target: 'tool:read_file',
        count: 1,
      }),
    ]);
  });
});
