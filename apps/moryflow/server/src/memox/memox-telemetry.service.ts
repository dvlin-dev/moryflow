import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma';
import type { MemoxWorkspaceContentConsumeResult } from './memox-workspace-content-consumer.service';

type MemoxConsumerTelemetry = {
  batches: number;
  claimed: number;
  acknowledged: number;
  failed: number;
  retryScheduled: number;
  deadLettered: number;
  poison: number;
};

type MemoxProjectionTelemetry = {
  upsertRequests: number;
  deleteRequests: number;
  identityResolves: number;
  identityLookups: number;
  identityLookupMisses: number;
  revisionCreates: number;
  revisionFinalizes: number;
  unchangedSkips: number;
  sourceDeletes: number;
};

export interface MemoxTelemetrySnapshot {
  generatedAt: string;
  consumer: MemoxConsumerTelemetry;
  projection: MemoxProjectionTelemetry;
  outbox: {
    pendingCount: number;
    deadLetteredCount: number;
    oldestPendingAgeMs: number | null;
    oldestDeadLetteredAgeMs: number | null;
  };
}

type MemoxTelemetryWarnThresholds = {
  pendingCount: number;
  deadLetteredCount: number;
  failedDelta: number;
  deadLetteredDelta: number;
};

type MemoxTelemetryCursor = {
  failed: number;
  deadLettered: number;
};

const DEFAULT_WARN_THRESHOLDS: MemoxTelemetryWarnThresholds = {
  pendingCount: 25,
  deadLetteredCount: 1,
  failedDelta: 1,
  deadLetteredDelta: 1,
};

const createConsumerTelemetry = (): MemoxConsumerTelemetry => ({
  batches: 0,
  claimed: 0,
  acknowledged: 0,
  failed: 0,
  retryScheduled: 0,
  deadLettered: 0,
  poison: 0,
});

const createProjectionTelemetry = (): MemoxProjectionTelemetry => ({
  upsertRequests: 0,
  deleteRequests: 0,
  identityResolves: 0,
  identityLookups: 0,
  identityLookupMisses: 0,
  revisionCreates: 0,
  revisionFinalizes: 0,
  unchangedSkips: 0,
  sourceDeletes: 0,
});

const createCursor = (): MemoxTelemetryCursor => ({
  failed: 0,
  deadLettered: 0,
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

const toAgeMs = (createdAt: Date | null | undefined): number | null =>
  createdAt ? Math.max(0, Date.now() - createdAt.getTime()) : null;

@Injectable()
export class MemoxTelemetryService implements OnModuleInit {
  private readonly logger = new Logger(MemoxTelemetryService.name);
  private readonly consumer = createConsumerTelemetry();
  private readonly projection = createProjectionTelemetry();
  private readonly warnThresholds: MemoxTelemetryWarnThresholds;
  private lastReportedCursor = createCursor();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.warnThresholds = {
      pendingCount: parseThreshold(
        this.configService.get<number | string>(
          'MEMOX_TELEMETRY_OUTBOX_PENDING_WARN_THRESHOLD',
        ),
        DEFAULT_WARN_THRESHOLDS.pendingCount,
      ),
      deadLetteredCount: parseThreshold(
        this.configService.get<number | string>(
          'MEMOX_TELEMETRY_OUTBOX_DEAD_LETTER_WARN_THRESHOLD',
        ),
        DEFAULT_WARN_THRESHOLDS.deadLetteredCount,
      ),
      failedDelta: parseThreshold(
        this.configService.get<number | string>(
          'MEMOX_TELEMETRY_FAILED_WARN_THRESHOLD',
        ),
        DEFAULT_WARN_THRESHOLDS.failedDelta,
      ),
      deadLetteredDelta: parseThreshold(
        this.configService.get<number | string>(
          'MEMOX_TELEMETRY_DEAD_LETTER_WARN_THRESHOLD',
        ),
        DEFAULT_WARN_THRESHOLDS.deadLetteredDelta,
      ),
    };
  }

  onModuleInit(): void {
    this.logger.log(
      `Periodic snapshot configured: consumer.failed>=${this.warnThresholds.failedDelta}, consumer.deadLettered>=${this.warnThresholds.deadLetteredDelta}, outbox.pendingCount>=${this.warnThresholds.pendingCount}, outbox.deadLetteredCount>=${this.warnThresholds.deadLetteredCount}`,
    );
  }

  recordBatch(result: MemoxWorkspaceContentConsumeResult): void {
    this.consumer.batches += 1;
    this.consumer.claimed += result.claimed;
    this.consumer.acknowledged += result.acknowledged;
  }

  recordFailure(params: { deadLettered: boolean; poison: boolean }): void {
    this.consumer.failed += 1;
    if (params.deadLettered) {
      this.consumer.deadLettered += 1;
    } else {
      this.consumer.retryScheduled += 1;
    }
    if (params.poison) {
      this.consumer.poison += 1;
    }
  }

  recordUpsertRequest(): void {
    this.projection.upsertRequests += 1;
  }

  recordDeleteRequest(): void {
    this.projection.deleteRequests += 1;
  }

  recordIdentityResolve(): void {
    this.projection.identityResolves += 1;
  }

  recordIdentityLookup(): void {
    this.projection.identityLookups += 1;
  }

  recordIdentityLookupMiss(): void {
    this.projection.identityLookupMisses += 1;
  }

  recordRevisionCreate(): void {
    this.projection.revisionCreates += 1;
  }

  recordRevisionFinalize(): void {
    this.projection.revisionFinalizes += 1;
  }

  recordUnchangedSkip(): void {
    this.projection.unchangedSkips += 1;
  }

  recordSourceDelete(): void {
    this.projection.sourceDeletes += 1;
  }

  async getSnapshot(): Promise<MemoxTelemetrySnapshot> {
    const [pendingCount, deadLetteredCount, oldestPending, oldestDeadLettered] =
      await Promise.all([
        this.prisma.workspaceContentOutbox.count({
          where: {
            processedAt: null,
            deadLetteredAt: null,
          },
        }),
        this.prisma.workspaceContentOutbox.count({
          where: {
            deadLetteredAt: {
              not: null,
            },
          },
        }),
        this.prisma.workspaceContentOutbox.findFirst({
          where: {
            processedAt: null,
            deadLetteredAt: null,
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            createdAt: true,
          },
        }),
        this.prisma.workspaceContentOutbox.findFirst({
          where: {
            deadLetteredAt: {
              not: null,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            createdAt: true,
          },
        }),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      consumer: { ...this.consumer },
      projection: { ...this.projection },
      outbox: {
        pendingCount,
        deadLetteredCount,
        oldestPendingAgeMs: toAgeMs(oldestPending?.createdAt),
        oldestDeadLetteredAgeMs: toAgeMs(oldestDeadLettered?.createdAt),
      },
    };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async reportPeriodicSnapshot(): Promise<MemoxTelemetrySnapshot> {
    const snapshot = await this.getSnapshot();
    const failedDelta = getFreshDelta(
      snapshot.consumer.failed,
      this.lastReportedCursor.failed,
    );
    const deadLetteredDelta = getFreshDelta(
      snapshot.consumer.deadLettered,
      this.lastReportedCursor.deadLettered,
    );

    this.lastReportedCursor = {
      failed: snapshot.consumer.failed,
      deadLettered: snapshot.consumer.deadLettered,
    };

    this.logger.log(
      `Memox telemetry snapshot: consumer.claimed=${snapshot.consumer.claimed}, consumer.acknowledged=${snapshot.consumer.acknowledged}, consumer.failed=${snapshot.consumer.failed}, consumer.deadLettered=${snapshot.consumer.deadLettered}, projection.identityLookupMisses=${snapshot.projection.identityLookupMisses}, outbox.pendingCount=${snapshot.outbox.pendingCount}, outbox.deadLetteredCount=${snapshot.outbox.deadLetteredCount}`,
    );

    if (failedDelta >= this.warnThresholds.failedDelta) {
      this.logger.warn(
        `Memox telemetry threshold exceeded: consumer.failed+${failedDelta}`,
      );
    }
    if (deadLetteredDelta >= this.warnThresholds.deadLetteredDelta) {
      this.logger.warn(
        `Memox telemetry threshold exceeded: consumer.deadLettered+${deadLetteredDelta}`,
      );
    }
    if (snapshot.outbox.pendingCount >= this.warnThresholds.pendingCount) {
      this.logger.warn(
        `Memox telemetry threshold exceeded: outbox.pendingCount=${snapshot.outbox.pendingCount}`,
      );
    }
    if (
      snapshot.outbox.deadLetteredCount >= this.warnThresholds.deadLetteredCount
    ) {
      this.logger.warn(
        `Memox telemetry threshold exceeded: outbox.deadLetteredCount=${snapshot.outbox.deadLetteredCount}`,
      );
    }

    return snapshot;
  }

  reset(): void {
    Object.assign(this.consumer, createConsumerTelemetry());
    Object.assign(this.projection, createProjectionTelemetry());
    this.lastReportedCursor = createCursor();
  }
}
