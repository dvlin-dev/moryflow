import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncCommitService } from './sync-commit.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';
import type { PrismaService } from '../prisma';
import type { VaultService } from '../vault';
import type { SyncCleanupService } from './sync-cleanup.service';
import type { SyncStorageDeletionService } from './sync-storage-deletion.service';
import type { SyncActionTokenService } from './sync-action-token.service';
import type { SyncObjectVerifyService } from './sync-object-verify.service';

describe('SyncCommitService', () => {
  let prismaMock: MockPrismaService;
  let vaultService: {
    getVault: ReturnType<typeof vi.fn>;
  };
  let syncCleanupService: {
    enqueueStorageDeletionRetry: ReturnType<typeof vi.fn>;
  };
  let syncObjectVerifyService: {
    loadOwnedExistingFiles: ReturnType<typeof vi.fn>;
    verifyUploadedObject: ReturnType<typeof vi.fn>;
  };
  let syncStorageDeletionService: {
    deleteTargetsOnce: ReturnType<typeof vi.fn>;
  };
  let syncActionTokenService: {
    verifyReceiptToken: ReturnType<typeof vi.fn>;
  };
  let service: SyncCommitService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) =>
        callback(prismaMock),
    );
    prismaMock.vault.findUnique.mockResolvedValue({
      workspaceId: 'workspace-1',
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue(null);
    prismaMock.workspaceDocument.upsert.mockResolvedValue({
      id: 'file-1',
      workspaceId: 'workspace-1',
      path: 'notes/doc.md',
      title: 'Doc',
      mimeType: 'text/markdown',
      currentRevisionId: null,
    });
    prismaMock.syncFile.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.syncFile.upsert.mockResolvedValue({
      id: 'file-1',
      documentId: 'file-1',
      vaultId: 'vault-1',
    });
    prismaMock.vaultDevice.upsert.mockResolvedValue({
      id: 'device-row-1',
      vaultId: 'vault-1',
      deviceId: 'device-1',
      deviceName: 'Unknown Device',
      lastSyncAt: new Date('2026-03-14T00:00:00.000Z'),
    });
    prismaMock.userStorageUsage.upsert.mockResolvedValue({
      id: 'usage-1',
      userId: 'user-1',
      storageUsed: BigInt(0),
      updatedAt: new Date('2026-03-14T00:00:00.000Z'),
    });
    prismaMock.$executeRaw.mockResolvedValue(1);

    vaultService = {
      getVault: vi.fn().mockResolvedValue({
        id: 'vault-1',
      }),
    };
    syncCleanupService = {
      enqueueStorageDeletionRetry: vi.fn().mockResolvedValue(undefined),
    };
    syncObjectVerifyService = {
      loadOwnedExistingFiles: vi.fn().mockResolvedValue(new Map()),
      verifyUploadedObject: vi.fn().mockResolvedValue(undefined),
    };
    syncStorageDeletionService = {
      deleteTargetsOnce: vi.fn().mockResolvedValue({
        retryTargets: [],
        skippedTargets: [],
      }),
    };
    syncActionTokenService = {
      verifyReceiptToken: vi.fn().mockReturnValue({
        version: 1,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 60_000,
        userId: 'user-1',
        vaultId: 'vault-1',
        deviceId: 'device-1',
        actionId: 'action-1',
        action: 'upload',
        file: {
          fileId: 'file-1',
          path: 'notes/doc.md',
          title: 'Doc',
          size: 128,
          contentHash: 'hash-1',
          storageRevision: 'storage-rev-1',
          vectorClock: { pc: 1 },
        },
      }),
    };

    service = new SyncCommitService(
      prismaMock as unknown as PrismaService,
      vaultService as unknown as VaultService,
      syncCleanupService as unknown as SyncCleanupService,
      syncObjectVerifyService as unknown as SyncObjectVerifyService,
      syncStorageDeletionService as unknown as SyncStorageDeletionService,
      syncActionTokenService as unknown as SyncActionTokenService,
    );
  });

  it('upserts the workspace document before publishing the sync file', async () => {
    const result = await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      receipts: [
        {
          actionId: 'action-1',
          receiptToken: 'receipt-1',
        },
      ],
    });

    expect(prismaMock.workspaceDocument.upsert).toHaveBeenCalledWith({
      where: { id: 'file-1' },
      create: {
        id: 'file-1',
        workspaceId: 'workspace-1',
        path: 'notes/doc.md',
        title: 'Doc',
        mimeType: 'text/markdown',
      },
      update: {
        path: 'notes/doc.md',
        title: 'Doc',
        mimeType: 'text/markdown',
      },
    });
    const syncFileUpsertArg = prismaMock.syncFile.upsert.mock.calls[0]?.[0] as
      | {
          where: {
            id: string;
          };
          create: {
            id: string;
            documentId: string;
            vaultId: string;
            path: string;
          };
          update: {
            documentId: string;
            path: string;
          };
        }
      | undefined;
    expect(syncFileUpsertArg).toBeDefined();
    expect(syncFileUpsertArg?.where).toEqual({ id: 'file-1' });
    expect(syncFileUpsertArg?.create).toMatchObject({
      id: 'file-1',
      documentId: 'file-1',
      vaultId: 'vault-1',
      path: 'notes/doc.md',
    });
    expect(syncFileUpsertArg?.update).toMatchObject({
      documentId: 'file-1',
      path: 'notes/doc.md',
    });
    expect(result.success).toBe(true);
    expect(
      prismaMock.workspaceDocument.upsert.mock.invocationCallOrder[0],
    ).toBeLessThan(prismaMock.syncFile.upsert.mock.invocationCallOrder[0]);
  });
});
