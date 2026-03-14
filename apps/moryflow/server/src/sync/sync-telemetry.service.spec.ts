import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { SyncTelemetryService } from './sync-telemetry.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('SyncTelemetryService', () => {
  let prismaMock: MockPrismaService;
  let service: SyncTelemetryService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.workspaceContentOutbox.count.mockResolvedValue(3);
    service = new SyncTelemetryService(
      prismaMock as never,
      {
        get: (_key: string, fallback?: number) => fallback,
      } as ConfigService,
    );
  });

  it('aggregates diff, commit and orphan cleanup metrics into a snapshot', async () => {
    service.recordDiff(
      {
        actions: [
          {
            actionId: 'action-1',
            receiptToken: 'receipt-1',
            action: 'upload',
            fileId: 'file-1',
            path: 'a.md',
          },
          {
            actionId: 'action-2',
            receiptToken: 'receipt-2',
            action: 'download',
            fileId: 'file-2',
            path: 'b.md',
          },
          {
            actionId: 'action-3',
            receiptToken: 'receipt-3',
            action: 'conflict',
            fileId: 'file-3',
            path: 'c.md',
            conflictCopyId: 'copy-1',
            conflictRename: 'c (conflict).md',
          },
        ],
      },
      12,
    );
    service.recordCommit(3, { success: true, syncedAt: new Date() }, 8);
    service.recordCommit(
      1,
      {
        success: false,
        syncedAt: new Date(),
        conflicts: [
          {
            fileId: 'file-4',
            path: 'd.md',
            expectedHash: 'hash-old',
            currentHash: 'hash-new',
          },
        ],
      },
      15,
    );
    service.recordOrphanCleanup(
      2,
      {
        accepted: true,
        deletedCount: 1,
        retryCount: 1,
        skippedCount: 0,
      },
      9,
    );

    const snapshot = await service.getSnapshot();

    expect(snapshot.outbox.pendingCount).toBe(3);
    expect(snapshot.diff.requests).toBe(1);
    expect(snapshot.diff.actions).toEqual({
      upload: 1,
      download: 1,
      delete: 0,
      conflict: 1,
    });
    expect(snapshot.commit.requests).toBe(2);
    expect(snapshot.commit.successes).toBe(1);
    expect(snapshot.commit.conflicts).toBe(1);
    expect(snapshot.commit.avgDurationMs).toBe(11.5);
    expect(snapshot.orphanCleanup.deleted).toBe(1);
    expect(snapshot.orphanCleanup.retried).toBe(1);
  });

  it('records failures without pretending they were successful executions', async () => {
    service.recordDiffFailure(7);
    service.recordCommitFailure(2, 11);
    service.recordOrphanCleanupFailure(4, 5);

    const snapshot = await service.getSnapshot();

    expect(snapshot.diff.requests).toBe(1);
    expect(snapshot.diff.failures).toBe(1);
    expect(snapshot.commit.requests).toBe(1);
    expect(snapshot.commit.failures).toBe(1);
    expect(snapshot.commit.lastReceiptCount).toBe(2);
    expect(snapshot.orphanCleanup.requests).toBe(1);
    expect(snapshot.orphanCleanup.failures).toBe(1);
    expect(snapshot.orphanCleanup.objectsRequested).toBe(4);
  });

  it('logs periodic snapshots and warns only for fresh threshold breaches', async () => {
    const log = vi.fn();
    const warn = vi.fn();
    (
      service as unknown as {
        logger: {
          log: typeof log;
          warn: typeof warn;
        };
      }
    ).logger = { log, warn };

    prismaMock.workspaceContentOutbox.count.mockResolvedValue(30);
    service.recordCommitFailure(2, 11);
    service.recordCommit(
      1,
      {
        success: false,
        syncedAt: new Date(),
        conflicts: [
          {
            fileId: 'file-1',
            path: 'a.md',
            expectedHash: 'hash-old',
            currentHash: 'hash-new',
          },
          {
            fileId: 'file-2',
            path: 'b.md',
            expectedHash: 'hash-old',
            currentHash: 'hash-new',
          },
          {
            fileId: 'file-3',
            path: 'c.md',
            expectedHash: 'hash-old',
            currentHash: 'hash-new',
          },
        ],
      },
      8,
    );
    service.recordOrphanCleanup(
      2,
      {
        accepted: true,
        deletedCount: 0,
        retryCount: 1,
        skippedCount: 0,
      },
      4,
    );

    await service.reportPeriodicSnapshot();

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Sync telemetry snapshot:'),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('commit.failures+1'),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('commit.conflicts+3'),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('orphanCleanup.retried+1'),
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('outbox.pendingCount=30'),
    );

    log.mockClear();
    warn.mockClear();

    await service.reportPeriodicSnapshot();

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Sync telemetry snapshot:'),
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('outbox.pendingCount=30'),
    );
  });
});
