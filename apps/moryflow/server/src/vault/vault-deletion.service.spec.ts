import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VaultDeletionService } from './vault-deletion.service';
import type { PrismaService } from '../prisma';
import type { StorageClient } from '../storage';
import type { QuotaService } from '../quota/quota.service';
import type { FileLifecycleOutboxWriterService } from '../sync/file-lifecycle-outbox-writer.service';

describe('VaultDeletionService', () => {
  let prisma: {
    vault: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let storageClient: {
    deleteFiles: ReturnType<typeof vi.fn>;
  };
  let quotaService: {
    recalculateStorageUsage: ReturnType<typeof vi.fn>;
  };
  let outboxWriter: {
    appendSyncCommitEvents: ReturnType<typeof vi.fn>;
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
        .mockImplementation(async (callback) => callback(tx)),
    };
    storageClient = {
      deleteFiles: vi.fn().mockResolvedValue(true),
    };
    quotaService = {
      recalculateStorageUsage: vi.fn().mockResolvedValue(undefined),
    };
    outboxWriter = {
      appendSyncCommitEvents: vi.fn().mockResolvedValue(undefined),
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
      ],
    });

    const service = new VaultDeletionService(
      prisma as unknown as PrismaService,
      storageClient as unknown as StorageClient,
      quotaService as unknown as QuotaService,
      outboxWriter as unknown as FileLifecycleOutboxWriterService,
    );

    await service.deleteVault('vault-1');

    expect(outboxWriter.appendSyncCommitEvents).toHaveBeenCalledWith(
      tx,
      'user-1',
      'vault-1',
      [],
      [{ fileId: 'file-1' }],
      expect.any(Map),
    );
    expect(tx.vault.delete).toHaveBeenCalledWith({ where: { id: 'vault-1' } });
    expect(storageClient.deleteFiles).toHaveBeenCalledWith(
      'user-1',
      'vault-1',
      ['file-1'],
    );
    expect(quotaService.recalculateStorageUsage).toHaveBeenCalledWith('user-1');
  });
});
