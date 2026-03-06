/**
 * [INPUT]: sync diff / commit / cleanup 的执行结果
 * [OUTPUT]: 内存态 telemetry counters + 内部 metrics snapshot
 * [POS]: Sync 观测事实源，供内部 metrics 和 runbook 排障使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type {
  SyncCommitResponseDto,
  SyncDiffResponseDto,
  SyncCleanupOrphansResponseDto,
} from './dto';

type DurationStats = {
  totalMs: number;
  lastMs: number;
  maxMs: number;
};

type ActionCounters = {
  upload: number;
  download: number;
  delete: number;
  conflict: number;
};

type DiffTelemetry = {
  requests: number;
  failures: number;
  lastActionCount: number;
  actions: ActionCounters;
  duration: DurationStats;
};

type CommitTelemetry = {
  requests: number;
  failures: number;
  successes: number;
  conflicts: number;
  lastReceiptCount: number;
  duration: DurationStats;
};

type CleanupTelemetry = {
  requests: number;
  failures: number;
  accepted: number;
  objectsRequested: number;
  deleted: number;
  retried: number;
  skipped: number;
  duration: DurationStats;
};

export interface SyncTelemetrySnapshot {
  generatedAt: string;
  diff: DiffTelemetry & {
    avgDurationMs: number;
  };
  commit: CommitTelemetry & {
    avgDurationMs: number;
  };
  orphanCleanup: CleanupTelemetry & {
    avgDurationMs: number;
  };
  outbox: {
    pendingCount: number;
  };
}

const createDurationStats = (): DurationStats => ({
  totalMs: 0,
  lastMs: 0,
  maxMs: 0,
});

const createActionCounters = (): ActionCounters => ({
  upload: 0,
  download: 0,
  delete: 0,
  conflict: 0,
});

const createDiffTelemetry = (): DiffTelemetry => ({
  requests: 0,
  failures: 0,
  lastActionCount: 0,
  actions: createActionCounters(),
  duration: createDurationStats(),
});

const createCommitTelemetry = (): CommitTelemetry => ({
  requests: 0,
  failures: 0,
  successes: 0,
  conflicts: 0,
  lastReceiptCount: 0,
  duration: createDurationStats(),
});

const createCleanupTelemetry = (): CleanupTelemetry => ({
  requests: 0,
  failures: 0,
  accepted: 0,
  objectsRequested: 0,
  deleted: 0,
  retried: 0,
  skipped: 0,
  duration: createDurationStats(),
});

const updateDurationStats = (
  stats: DurationStats,
  durationMs: number,
): void => {
  stats.totalMs += durationMs;
  stats.lastMs = durationMs;
  stats.maxMs = Math.max(stats.maxMs, durationMs);
};

const toAvgDurationMs = (stats: DurationStats, requests: number): number =>
  requests === 0 ? 0 : Math.round((stats.totalMs / requests) * 100) / 100;

@Injectable()
export class SyncTelemetryService {
  private readonly diff = createDiffTelemetry();
  private readonly commit = createCommitTelemetry();
  private readonly orphanCleanup = createCleanupTelemetry();

  constructor(private readonly prisma: PrismaService) {}

  recordDiff(result: SyncDiffResponseDto, durationMs: number): void {
    this.diff.requests += 1;
    this.diff.lastActionCount = result.actions.length;
    updateDurationStats(this.diff.duration, durationMs);

    for (const action of result.actions) {
      this.diff.actions[action.action] += 1;
    }
  }

  recordDiffFailure(durationMs: number): void {
    this.diff.requests += 1;
    this.diff.failures += 1;
    this.diff.lastActionCount = 0;
    updateDurationStats(this.diff.duration, durationMs);
  }

  recordCommit(
    receiptCount: number,
    result: SyncCommitResponseDto,
    durationMs: number,
  ): void {
    this.commit.requests += 1;
    this.commit.lastReceiptCount = receiptCount;
    updateDurationStats(this.commit.duration, durationMs);

    if (result.success) {
      this.commit.successes += 1;
      return;
    }

    this.commit.conflicts += result.conflicts?.length ?? 0;
  }

  recordCommitFailure(receiptCount: number, durationMs: number): void {
    this.commit.requests += 1;
    this.commit.failures += 1;
    this.commit.lastReceiptCount = receiptCount;
    updateDurationStats(this.commit.duration, durationMs);
  }

  recordOrphanCleanup(
    objectCount: number,
    result: SyncCleanupOrphansResponseDto,
    durationMs: number,
  ): void {
    this.orphanCleanup.requests += 1;
    this.orphanCleanup.accepted += result.accepted ? 1 : 0;
    this.orphanCleanup.objectsRequested += objectCount;
    this.orphanCleanup.deleted += result.deletedCount;
    this.orphanCleanup.retried += result.retryCount;
    this.orphanCleanup.skipped += result.skippedCount;
    updateDurationStats(this.orphanCleanup.duration, durationMs);
  }

  recordOrphanCleanupFailure(objectCount: number, durationMs: number): void {
    this.orphanCleanup.requests += 1;
    this.orphanCleanup.failures += 1;
    this.orphanCleanup.objectsRequested += objectCount;
    updateDurationStats(this.orphanCleanup.duration, durationMs);
  }

  async getSnapshot(): Promise<SyncTelemetrySnapshot> {
    const pendingCount = await this.prisma.fileLifecycleOutbox.count({
      where: {
        processedAt: null,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      diff: {
        ...this.diff,
        actions: { ...this.diff.actions },
        duration: { ...this.diff.duration },
        avgDurationMs: toAvgDurationMs(this.diff.duration, this.diff.requests),
      },
      commit: {
        ...this.commit,
        duration: { ...this.commit.duration },
        avgDurationMs: toAvgDurationMs(
          this.commit.duration,
          this.commit.requests,
        ),
      },
      orphanCleanup: {
        ...this.orphanCleanup,
        duration: { ...this.orphanCleanup.duration },
        avgDurationMs: toAvgDurationMs(
          this.orphanCleanup.duration,
          this.orphanCleanup.requests,
        ),
      },
      outbox: {
        pendingCount,
      },
    };
  }

  reset(): void {
    Object.assign(this.diff, createDiffTelemetry());
    Object.assign(this.commit, createCommitTelemetry());
    Object.assign(this.orphanCleanup, createCleanupTelemetry());
  }
}
