/**
 * [INPUT]: consumer claim/ack/fail 请求
 * [OUTPUT]: leased outbox events 与状态迁移结果
 * [POS]: Sync outbox 的租约与重试状态机边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma';
import type {
  ClaimPendingBatchOptions,
  FailClaimedEventOptions,
  FailClaimedEventResult,
  FileLifecycleOutboxRecord,
} from './file-lifecycle-outbox.types';

const OUTBOX_MAX_ATTEMPTS = 5;
const OUTBOX_RETRY_BASE_DELAY_MS = 5_000;
const OUTBOX_RETRY_MAX_DELAY_MS = 5 * 60_000;

@Injectable()
export class FileLifecycleOutboxLeaseService {
  constructor(private readonly prisma: PrismaService) {}

  async claimPendingBatch(
    options: ClaimPendingBatchOptions,
  ): Promise<FileLifecycleOutboxRecord[]> {
    const now = options.now ?? new Date();
    const leaseExpiresAt = new Date(now.getTime() + options.leaseMs);
    const leaseOwner = this.buildLeaseOwner(options.consumerId);

    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.fileLifecycleOutbox.findMany({
        where: {
          processedAt: null,
          deadLetteredAt: null,
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
        },
        orderBy: { createdAt: 'asc' },
        take: options.limit,
      });

      if (candidates.length === 0) {
        return [];
      }

      const ids = candidates.map((event) => event.id);
      await tx.fileLifecycleOutbox.updateMany({
        where: {
          id: { in: ids },
          processedAt: null,
          deadLetteredAt: null,
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
        },
        data: {
          leasedBy: leaseOwner,
          leaseExpiresAt,
          attemptCount: {
            increment: 1,
          },
          lastAttemptAt: now,
        },
      });

      return tx.fileLifecycleOutbox.findMany({
        where: {
          id: { in: ids },
          processedAt: null,
          leasedBy: leaseOwner,
          leaseExpiresAt,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  }

  async ackClaimedBatch(
    leaseOwner: string,
    ids: string[],
    now: Date = new Date(),
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const result = await this.prisma.fileLifecycleOutbox.updateMany({
      where: {
        id: { in: ids },
        processedAt: null,
        leasedBy: leaseOwner,
      },
      data: {
        processedAt: now,
        leasedBy: null,
        leaseExpiresAt: null,
      },
    });

    return result.count;
  }

  async failClaimedEvent(
    options: FailClaimedEventOptions,
  ): Promise<FailClaimedEventResult> {
    const now = options.now ?? new Date();
    const shouldDeadLetter =
      !options.retryable || options.attemptCount >= OUTBOX_MAX_ATTEMPTS;
    const retryAt = shouldDeadLetter
      ? null
      : new Date(
          now.getTime() + this.calculateRetryDelayMs(options.attemptCount),
        );

    await this.prisma.fileLifecycleOutbox.updateMany({
      where: {
        id: options.id,
        processedAt: null,
        leasedBy: options.leaseOwner,
      },
      data: {
        leasedBy: null,
        leaseExpiresAt: retryAt,
        lastErrorCode: options.errorCode ?? null,
        lastErrorMessage: options.errorMessage,
        deadLetteredAt: shouldDeadLetter ? now : null,
      },
    });

    return {
      state: shouldDeadLetter ? 'dead_lettered' : 'retry_scheduled',
      retryAt,
    };
  }

  private calculateRetryDelayMs(attemptCount: number): number {
    const normalizedAttemptCount = Math.max(1, attemptCount);
    return Math.min(
      OUTBOX_RETRY_MAX_DELAY_MS,
      OUTBOX_RETRY_BASE_DELAY_MS * 2 ** (normalizedAttemptCount - 1),
    );
  }

  private buildLeaseOwner(consumerId: string): string {
    return `${consumerId}:${randomUUID()}`;
  }
}

export type {
  ClaimPendingBatchOptions,
  FailClaimedEventOptions,
  FailClaimedEventResult,
  FileLifecycleOutboxRecord,
} from './file-lifecycle-outbox.types';
