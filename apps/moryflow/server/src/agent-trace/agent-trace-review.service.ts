import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type ReviewTraceSpan = {
  traceId: string;
  spanId: string;
  type: string;
  name: string;
  status: string;
  duration: number | null;
};

type ReviewTrace = {
  traceId: string;
  agentName: string;
  status: string;
  totalTokens: number;
  duration: number | null;
  startedAt: Date;
  metadata: Record<string, unknown> | null;
  spans: ReviewTraceSpan[];
};

export interface AgentTraceReviewQuery {
  days?: number;
  topN?: number;
  tokenThreshold?: number;
  durationThresholdMs?: number;
}

export interface AgentTraceReviewSummary {
  overview: {
    days: number;
    totalTraces: number;
    failedTraces: number;
    interruptedTraces: number;
    highTokenTraceCount: number;
    longTraceCount: number;
  };
  failedTools: Array<{
    toolName: string;
    failedCount: number;
    totalCalls: number;
    failureRate: number;
  }>;
  approvalHotspots: Array<{
    target: string;
    count: number;
  }>;
  compaction: {
    triggeredCount: number;
    triggerRate: number;
  };
  doomLoop: {
    triggeredCount: number;
    triggerRate: number;
  };
  traceHotspots: Array<{
    traceId: string;
    agentName: string;
    status: string;
    totalTokens: number;
    duration: number | null;
    startedAt: string;
  }>;
}

const DEFAULT_DAYS = 7;
const DEFAULT_TOP_N = 5;
const DEFAULT_TOKEN_THRESHOLD = 2000;
const DEFAULT_DURATION_THRESHOLD_MS = 10_000;

const toRate = (value: number, total: number): number =>
  total === 0 ? 0 : Math.round((value / total) * 10_000) / 100;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getNestedRecord = (
  value: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> | null => asRecord(value?.[key]);

const getBoolean = (
  value: Record<string, unknown> | null,
  key: string,
): boolean => value?.[key] === true;

const getString = (
  value: Record<string, unknown> | null,
  key: string,
): string | null => {
  const candidate = value?.[key];
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : null;
};

const normalizeApprovalTarget = (
  metadata: Record<string, unknown> | null,
): string | null => {
  const approval = getNestedRecord(metadata, 'approval');
  if (!approval || !getBoolean(approval, 'requested')) {
    return null;
  }

  return (
    getString(approval, 'target') ??
    getString(approval, 'path') ??
    (getString(approval, 'toolName')
      ? `tool:${getString(approval, 'toolName')}`
      : null) ??
    'approval:unknown'
  );
};

const hasMarker = (
  metadata: Record<string, unknown> | null,
  key: string,
): boolean => {
  const section = getNestedRecord(metadata, key);
  return getBoolean(section, 'triggered');
};

const compareTraceHotspot = (
  a: AgentTraceReviewSummary['traceHotspots'][number],
  b: AgentTraceReviewSummary['traceHotspots'][number],
) => {
  if (b.totalTokens !== a.totalTokens) {
    return b.totalTokens - a.totalTokens;
  }
  return (b.duration ?? 0) - (a.duration ?? 0);
};

@Injectable()
export class AgentTraceReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getReviewSummary(
    userId: string,
    query: AgentTraceReviewQuery = {},
  ): Promise<AgentTraceReviewSummary> {
    const days = query.days ?? DEFAULT_DAYS;
    const topN = query.topN ?? DEFAULT_TOP_N;
    const tokenThreshold = query.tokenThreshold ?? DEFAULT_TOKEN_THRESHOLD;
    const durationThresholdMs =
      query.durationThresholdMs ?? DEFAULT_DURATION_THRESHOLD_MS;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const traces = (await this.prisma.agentTrace.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
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
    })) as unknown as ReviewTrace[];

    return buildAgentTraceReviewSummary(traces, {
      days,
      topN,
      tokenThreshold,
      durationThresholdMs,
    });
  }
}

export const buildAgentTraceReviewSummary = (
  traces: ReviewTrace[],
  input: {
    days: number;
    topN: number;
    tokenThreshold: number;
    durationThresholdMs: number;
  },
): AgentTraceReviewSummary => {
  const failedToolCounts = new Map<
    string,
    { failedCount: number; totalCalls: number }
  >();
  const approvalHotspots = new Map<string, number>();
  let compactionTriggeredCount = 0;
  let doomLoopTriggeredCount = 0;
  let failedTraces = 0;
  let interruptedTraces = 0;
  let highTokenTraceCount = 0;
  let longTraceCount = 0;

  const traceHotspots = traces
    .filter(
      (trace) =>
        trace.totalTokens >= input.tokenThreshold ||
        (trace.duration ?? 0) >= input.durationThresholdMs ||
        trace.status === 'interrupted',
    )
    .map((trace) => ({
      traceId: trace.traceId,
      agentName: trace.agentName,
      status: trace.status,
      totalTokens: trace.totalTokens ?? 0,
      duration: trace.duration,
      startedAt: trace.startedAt.toISOString(),
    }))
    .sort(compareTraceHotspot)
    .slice(0, input.topN);

  for (const trace of traces) {
    if (trace.status === 'failed') {
      failedTraces += 1;
    }
    if (trace.status === 'interrupted') {
      interruptedTraces += 1;
    }
    if ((trace.totalTokens ?? 0) >= input.tokenThreshold) {
      highTokenTraceCount += 1;
    }
    if ((trace.duration ?? 0) >= input.durationThresholdMs) {
      longTraceCount += 1;
    }

    const metadata = asRecord(trace.metadata);
    const approvalTarget = normalizeApprovalTarget(metadata);
    if (approvalTarget) {
      approvalHotspots.set(
        approvalTarget,
        (approvalHotspots.get(approvalTarget) ?? 0) + 1,
      );
    }
    if (hasMarker(metadata, 'compaction')) {
      compactionTriggeredCount += 1;
    }
    if (hasMarker(metadata, 'doomLoop')) {
      doomLoopTriggeredCount += 1;
    }

    for (const span of trace.spans) {
      if (span.type !== 'function') {
        continue;
      }
      const current = failedToolCounts.get(span.name) ?? {
        failedCount: 0,
        totalCalls: 0,
      };
      current.totalCalls += 1;
      if (span.status === 'failed') {
        current.failedCount += 1;
      }
      failedToolCounts.set(span.name, current);
    }
  }

  return {
    overview: {
      days: input.days,
      totalTraces: traces.length,
      failedTraces,
      interruptedTraces,
      highTokenTraceCount,
      longTraceCount,
    },
    failedTools: [...failedToolCounts.entries()]
      .filter(([, value]) => value.failedCount > 0)
      .map(([toolName, value]) => ({
        toolName,
        failedCount: value.failedCount,
        totalCalls: value.totalCalls,
        failureRate: toRate(value.failedCount, value.totalCalls),
      }))
      .sort((a, b) => {
        if (b.failedCount !== a.failedCount) {
          return b.failedCount - a.failedCount;
        }
        return b.totalCalls - a.totalCalls;
      })
      .slice(0, input.topN),
    approvalHotspots: [...approvalHotspots.entries()]
      .map(([target, count]) => ({ target, count }))
      .sort((a, b) => b.count - a.count || a.target.localeCompare(b.target))
      .slice(0, input.topN),
    compaction: {
      triggeredCount: compactionTriggeredCount,
      triggerRate: toRate(compactionTriggeredCount, traces.length),
    },
    doomLoop: {
      triggeredCount: doomLoopTriggeredCount,
      triggerRate: toRate(doomLoopTriggeredCount, traces.length),
    },
    traceHotspots,
  };
};
