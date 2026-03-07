/**
 * [INPUT]: sync diff / commit / cleanup 的执行结果
 * [OUTPUT]: 内存态 telemetry counters + 内部 metrics snapshot + 周期性结构化日志
 * [POS]: Sync 观测事实源，供内部 metrics、周期告警与 runbook 排障使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
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

type SyncTelemetryWarnThresholds = {
  commitFailures: number;
  commitConflicts: number;
  orphanCleanupRetries: number;
  outboxPendingCount: number;
};

type SyncTelemetryCursor = {
  commitFailures: number;
  commitConflicts: number;
  orphanCleanupRetries: number;
};

const DEFAULT_WARN_THRESHOLDS: SyncTelemetryWarnThresholds = {
  commitFailures: 1,
  commitConflicts: 3,
  orphanCleanupRetries: 1,
  outboxPendingCount: 25,
};

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

const createSyncTelemetryCursor = (): SyncTelemetryCursor => ({
  commitFailures: 0,
  commitConflicts: 0,
  orphanCleanupRetries: 0,
});

const parseThreshold = (
  value: number | string | undefined,
  fallback: number,
): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }

  return fallback;
};

const getFreshDelta = (current: number, previous: number): number =>
  current >= previous ? current - previous : current;

@Injectable()
export class SyncTelemetryService implements OnModuleInit {
  private readonly logger = new Logger(SyncTelemetryService.name);
  private readonly diff = createDiffTelemetry();
  private readonly commit = createCommitTelemetry();
  private readonly orphanCleanup = createCleanupTelemetry();
  private readonly warnThresholds: SyncTelemetryWarnThresholds;
  private lastReportedCursor = createSyncTelemetryCursor();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.warnThresholds = {
      commitFailures: parseThreshold(
        this.configService.get<number | string>(
          'SYNC_TELEMETRY_COMMIT_FAILURE_WARN_THRESHOLD',
        ),
        DEFAULT_WARN_THRESHOLDS.commitFailures,
      ),
      commitConflicts: parseThreshold(
        this.configService.get<number | string>(
          'SYNC_TELEMETRY_COMMIT_CONFLICT_WARN_THRESHOLD',
        ),
        DEFAULT_WARN_THRESHOLDS.commitConflicts,
      ),
      orphanCleanupRetries: parseThreshold(
        this.configService.get<number | string>(
          'SYNC_TELEMETRY_ORPHAN_RETRY_WARN_THRESHOLD',
        ),
        DEFAULT_WARN_THRESHOLDS.orphanCleanupRetries,
      ),
      outboxPendingCount: parseThreshold(
        this.configService.get<number | string>(
          'SYNC_TELEMETRY_OUTBOX_PENDING_WARN_THRESHOLD',
        ),
        DEFAULT_WARN_THRESHOLDS.outboxPendingCount,
      ),
    };
  }

  onModuleInit(): void {
    this.logger.log(
      `Periodic snapshot configured: commit.failures>=${this.warnThresholds.commitFailures}, commit.conflicts>=${this.warnThresholds.commitConflicts}, orphanCleanup.retried>=${this.warnThresholds.orphanCleanupRetries}, outbox.pendingCount>=${this.warnThresholds.outboxPendingCount}`,
    );
  }

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

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reportPeriodicSnapshot(): Promise<SyncTelemetrySnapshot> {
    const snapshot = await this.getSnapshot();
    const commitFailureDelta = getFreshDelta(
      snapshot.commit.failures,
      this.lastReportedCursor.commitFailures,
    );
    const commitConflictDelta = getFreshDelta(
      snapshot.commit.conflicts,
      this.lastReportedCursor.commitConflicts,
    );
    const orphanRetryDelta = getFreshDelta(
      snapshot.orphanCleanup.retried,
      this.lastReportedCursor.orphanCleanupRetries,
    );

    this.lastReportedCursor = {
      commitFailures: snapshot.commit.failures,
      commitConflicts: snapshot.commit.conflicts,
      orphanCleanupRetries: snapshot.orphanCleanup.retried,
    };

    this.logger.log(
      `Sync telemetry snapshot: diff.requests=${snapshot.diff.requests}, diff.failures=${snapshot.diff.failures}, commit.requests=${snapshot.commit.requests}, commit.failures=${snapshot.commit.failures}, commit.conflicts=${snapshot.commit.conflicts}, orphanCleanup.retried=${snapshot.orphanCleanup.retried}, outbox.pendingCount=${snapshot.outbox.pendingCount}`,
    );

    if (commitFailureDelta >= this.warnThresholds.commitFailures) {
      this.logger.warn(
        `Sync telemetry threshold exceeded: commit.failures+${commitFailureDelta}`,
      );
    }
    if (commitConflictDelta >= this.warnThresholds.commitConflicts) {
      this.logger.warn(
        `Sync telemetry threshold exceeded: commit.conflicts+${commitConflictDelta}`,
      );
    }
    if (orphanRetryDelta >= this.warnThresholds.orphanCleanupRetries) {
      this.logger.warn(
        `Sync telemetry threshold exceeded: orphanCleanup.retried+${orphanRetryDelta}`,
      );
    }
    if (
      snapshot.outbox.pendingCount >= this.warnThresholds.outboxPendingCount
    ) {
      this.logger.warn(
        `Sync telemetry threshold exceeded: outbox.pendingCount=${snapshot.outbox.pendingCount}`,
      );
    }

    return snapshot;
  }

  reset(): void {
    Object.assign(this.diff, createDiffTelemetry());
    Object.assign(this.commit, createCommitTelemetry());
    Object.assign(this.orphanCleanup, createCleanupTelemetry());
    this.lastReportedCursor = createSyncTelemetryCursor();
  }
}
