import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VaultDeletionService } from './vault-deletion.service';
import type { PrismaService } from '../prisma';
import type { QuotaService } from '../quota/quota.service';
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
  let syncStorageDeletionService: {
    deleteTargetsOnce: ReturnType<typeof vi.fn>;
  };
  let tx: {
    vault: {
      delete: ReturnType<typeof vi.fn>;
    };
    workspaceContentOutbox: {
      findMany: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    tx = {
      vault: {
        delete: vi.fn().mockResolvedValue(undefined),
      },
      workspaceContentOutbox: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
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
    syncStorageDeletionService = {
      deleteTargetsOnce: vi.fn().mockResolvedValue({
        retryTargets: [],
        skippedTargets: [],
      }),
    };
  });

  it('deletes the vault, removes stored sync objects, and recalculates quota', async () => {
    prisma.vault.findUnique.mockResolvedValue({
      id: 'vault-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
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
      quotaService as unknown as QuotaService,
      syncStorageDeletionService as unknown as SyncStorageDeletionService,
    );

    await service.deleteVault('vault-1');

    expect(tx.workspaceContentOutbox.findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: 'workspace-1',
        processedAt: null,
        deadLetteredAt: null,
      },
      select: {
        id: true,
        payload: true,
      },
    });
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
      ],
      'immediate',
    );
    expect(quotaService.recalculateStorageUsage).toHaveBeenCalledWith('user-1');
  });

  it('purges pending sync_object_ref outbox events before deleting the transport', async () => {
    prisma.vault.findUnique.mockResolvedValue({
      id: 'vault-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      files: [],
    });
    tx.workspaceContentOutbox.findMany.mockResolvedValue([
      {
        id: 'event-sync-ref',
        payload: {
          mode: 'sync_object_ref',
          vaultId: 'vault-1',
          documentId: 'doc-1',
        },
      },
      {
        id: 'event-inline',
        payload: {
          mode: 'inline_text',
          documentId: 'doc-2',
        },
      },
      {
        id: 'event-other-vault',
        payload: {
          mode: 'sync_object_ref',
          vaultId: 'vault-2',
          documentId: 'doc-3',
        },
      },
    ]);

    const service = new VaultDeletionService(
      prisma as unknown as PrismaService,
      quotaService as unknown as QuotaService,
      syncStorageDeletionService as unknown as SyncStorageDeletionService,
    );

    await service.deleteVault('vault-1');

    expect(tx.workspaceContentOutbox.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['event-sync-ref'],
        },
      },
    });
    expect(tx.vault.delete).toHaveBeenCalledWith({ where: { id: 'vault-1' } });
  });

  it('does not delete WorkspaceDocument rows when a vault is deleted', async () => {
    const txWithDocuments = {
      ...tx,
      workspaceDocument: {
        deleteMany: vi.fn(),
        delete: vi.fn(),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (db: typeof txWithDocuments) => Promise<unknown>) =>
        callback(txWithDocuments),
    );

    prisma.vault.findUnique.mockResolvedValue({
      id: 'vault-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
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
      quotaService as unknown as QuotaService,
      syncStorageDeletionService as unknown as SyncStorageDeletionService,
    );

    await service.deleteVault('vault-1');

    expect(txWithDocuments.workspaceDocument.deleteMany).not.toHaveBeenCalled();
    expect(txWithDocuments.workspaceDocument.delete).not.toHaveBeenCalled();
    expect(txWithDocuments.vault.delete).toHaveBeenCalledWith({ where: { id: 'vault-1' } });
  });
});
