import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VaultDeletionService } from './vault-deletion.service';
import type { PrismaService } from '../prisma';
import type { QuotaService } from '../quota/quota.service';
import type { FileLifecycleOutboxWriterService } from '../sync/file-lifecycle-outbox-writer.service';
import type { SyncStorageDeletionService } from '../sync/sync-storage-deletion.service';

describe('VaultDeletionService', () => {
  let prisma: {
    vault: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let quotaService: {
    recalculateStorageUsage: ReturnType<typeof vi.fn>;
  };
  let outboxWriter: {
    appendSyncCommitEvents: ReturnType<typeof vi.fn>;
  };
  let syncStorageDeletionService: {
    deleteTargetsOnce: ReturnType<typeof vi.fn>;
  };
  let tx: {
    fileLifecycleOutbox: {
      createMany: ReturnType<typeof vi.fn>;
    };
    vault: {
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    tx = {
      fileLifecycleOutbox: {
        createMany: vi.fn().mockResolvedValue(undefined),
      },
      vault: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };
    prisma = {
      vault: {
        findUnique: vi.fn(),
      },
      $transaction: vi
        .fn()
        .mockImplementation((callback: (db: typeof tx) => Promise<unknown>) =>
          callback(tx),
        ),
    };
    quotaService = {
      recalculateStorageUsage: vi.fn().mockResolvedValue(undefined),
    };
    outboxWriter = {
      appendSyncCommitEvents: vi.fn().mockResolvedValue(undefined),
    };
    syncStorageDeletionService = {
      deleteTargetsOnce: vi.fn().mockResolvedValue({
        retryTargets: [],
        skippedTargets: [],
      }),
    };
  });

  it('writes file_deleted outbox events before deleting the vault and recalculates quota', async () => {
    prisma.vault.findUnique.mockResolvedValue({
      id: 'vault-1',
      userId: 'user-1',
      files: [
        {
          id: 'file-1',
          path: '/Doc.md',
          title: 'Doc',
          size: 128,
          contentHash: 'hash-1',
          storageRevision: 'rev-1',
          vectorClock: { pc: 1 },
          isDeleted: false,
        },
        {
          id: 'file-2',
          path: '/Deleted.md',
          title: 'Deleted',
          size: 64,
          contentHash: 'hash-2',
          storageRevision: 'rev-2',
          vectorClock: { pc: 2 },
          isDeleted: true,
        },
      ],
    });

    const service = new VaultDeletionService(
      prisma as unknown as PrismaService,
      quotaService as unknown as QuotaService,
      outboxWriter as unknown as FileLifecycleOutboxWriterService,
      syncStorageDeletionService as unknown as SyncStorageDeletionService,
    );

    await service.deleteVault('vault-1');

    expect(outboxWriter.appendSyncCommitEvents).toHaveBeenCalledWith(
      tx,
      'user-1',
      'vault-1',
      [],
      [{ fileId: 'file-1' }, { fileId: 'file-2' }],
      expect.any(Map),
    );
    expect(tx.vault.delete).toHaveBeenCalledWith({ where: { id: 'vault-1' } });
    expect(syncStorageDeletionService.deleteTargetsOnce).toHaveBeenCalledWith(
      'user-1',
      'vault-1',
      [
        {
          fileId: 'file-1',
          expectedHash: 'hash-1',
          expectedStorageRevision: 'rev-1',
        },
        {
          fileId: 'file-2',
          expectedHash: 'hash-2',
          expectedStorageRevision: 'rev-2',
        },
      ],
      'immediate',
    );
    expect(quotaService.recalculateStorageUsage).toHaveBeenCalledWith('user-1');
  });
});
