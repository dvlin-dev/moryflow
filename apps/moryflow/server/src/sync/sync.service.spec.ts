import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncService } from './sync.service';
import type { SyncPlanService } from './sync-plan.service';
import type { SyncCommitService } from './sync-commit.service';
import type { SyncOrphanCleanupService } from './sync-orphan-cleanup.service';
import type { SyncTelemetryService } from './sync-telemetry.service';
import type { PrismaService } from '../prisma';
import type { VaultService } from '../vault';

describe('SyncService', () => {
  let syncPlanService: {
    calculateDiff: ReturnType<typeof vi.fn>;
  };
  let syncCommitService: {
    commitSync: ReturnType<typeof vi.fn>;
  };
  let syncOrphanCleanupService: {
    cleanupOrphans: ReturnType<typeof vi.fn>;
  };
  let syncTelemetryService: {
    recordDiff: ReturnType<typeof vi.fn>;
    recordDiffFailure: ReturnType<typeof vi.fn>;
    recordCommit: ReturnType<typeof vi.fn>;
    recordCommitFailure: ReturnType<typeof vi.fn>;
    recordOrphanCleanup: ReturnType<typeof vi.fn>;
    recordOrphanCleanupFailure: ReturnType<typeof vi.fn>;
  };
  let service: SyncService;

  beforeEach(() => {
    syncPlanService = {
      calculateDiff: vi.fn(),
    };
    syncCommitService = {
      commitSync: vi.fn(),
    };
    syncOrphanCleanupService = {
      cleanupOrphans: vi.fn(),
    };
    syncTelemetryService = {
      recordDiff: vi.fn(),
      recordDiffFailure: vi.fn(),
      recordCommit: vi.fn(),
      recordCommitFailure: vi.fn(),
      recordOrphanCleanup: vi.fn(),
      recordOrphanCleanupFailure: vi.fn(),
    };

    service = new SyncService(
      {} as PrismaService,
      {} as VaultService,
      syncPlanService as unknown as SyncPlanService,
      syncCommitService as unknown as SyncCommitService,
      syncOrphanCleanupService as unknown as SyncOrphanCleanupService,
      syncTelemetryService as unknown as SyncTelemetryService,
    );
  });

  it('delegates commitSync and records telemetry on success', async () => {
    const result = {
      success: true as const,
      syncedAt: new Date('2026-03-14T00:00:00.000Z'),
    };
    syncCommitService.commitSync.mockResolvedValue(result);

    const response = await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      receipts: [],
    });

    expect(syncCommitService.commitSync).toHaveBeenCalledWith('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      receipts: [],
    });
    expect(syncTelemetryService.recordCommit).toHaveBeenCalledWith(
      0,
      result,
      expect.any(Number),
    );
    expect(response).toBe(result);
  });

  it('records telemetry failures when commitSync throws', async () => {
    syncCommitService.commitSync.mockRejectedValue(new Error('boom'));

    await expect(
      service.commitSync('user-1', {
        vaultId: 'vault-1',
        deviceId: 'device-1',
        receipts: [{ actionId: 'action-1', receiptToken: 'receipt-1' }],
      }),
    ).rejects.toThrow('boom');

    expect(syncTelemetryService.recordCommitFailure).toHaveBeenCalledWith(
      1,
      expect.any(Number),
    );
    expect(syncTelemetryService.recordCommit).not.toHaveBeenCalled();
  });

  it('delegates orphan cleanup and records cleanup metrics', async () => {
    const result = {
      accepted: true,
      deletedCount: 1,
      retryCount: 0,
      skippedCount: 0,
    };
    syncOrphanCleanupService.cleanupOrphans.mockResolvedValue(result);

    const response = await service.cleanupOrphans('user-1', {
      vaultId: 'vault-1',
      objects: [
        { fileId: 'file-1', storageRevision: 'rev-1', contentHash: 'hash-1' },
      ],
    });

    expect(syncOrphanCleanupService.cleanupOrphans).toHaveBeenCalledWith(
      'user-1',
      {
        vaultId: 'vault-1',
        objects: [
          {
            fileId: 'file-1',
            storageRevision: 'rev-1',
            contentHash: 'hash-1',
          },
        ],
      },
    );
    expect(syncTelemetryService.recordOrphanCleanup).toHaveBeenCalledWith(
      1,
      result,
      expect.any(Number),
    );
    expect(response).toBe(result);
  });
});
