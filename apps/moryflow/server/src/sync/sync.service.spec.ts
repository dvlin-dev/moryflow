import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncCleanupService } from './sync-cleanup.service';
import { SyncStorageDeletionService } from './sync-storage-deletion.service';
import { PrismaService } from '../prisma';
import { VaultService } from '../vault';
import { QuotaService } from '../quota';
import { StorageClient } from '../storage';
import { VectorizeService } from '../vectorize';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('SyncService.commitSync', () => {
  let service: SyncService;
  let prismaMock: MockPrismaService;
  let vaultServiceMock: { getVault: ReturnType<typeof vi.fn> };
  let quotaServiceMock: {
    checkFileSizeAllowed: ReturnType<typeof vi.fn>;
    checkStorageAllowed: ReturnType<typeof vi.fn>;
  };
  let storageClientMock: {
    isConfigured: ReturnType<typeof vi.fn>;
    getBatchUrls: ReturnType<typeof vi.fn>;
  };
  let vectorizeServiceMock: {
    queueFromSync: ReturnType<typeof vi.fn>;
  };
  let syncCleanupServiceMock: {
    enqueueStorageDeletionRetry: ReturnType<typeof vi.fn>;
  };
  let syncStorageDeletionServiceMock: {
    deleteTargetsOnce: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    (
      prismaMock as unknown as {
        vaultDevice: { upsert: ReturnType<typeof vi.fn> };
      }
    ).vaultDevice = {
      upsert: vi.fn().mockResolvedValue(undefined),
    };
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
        if (typeof callback === 'function') {
          return callback(prismaMock);
        }
        return callback;
      },
    );
    prismaMock.userStorageUsage.findUnique.mockResolvedValue({
      storageUsed: BigInt(0),
    });
    prismaMock.userStorageUsage.upsert.mockResolvedValue({
      storageUsed: BigInt(0),
    });

    vaultServiceMock = {
      getVault: vi.fn().mockResolvedValue({ id: 'vault-1' }),
    };

    quotaServiceMock = {
      checkFileSizeAllowed: vi.fn().mockReturnValue({ allowed: true }),
      checkStorageAllowed: vi.fn().mockResolvedValue({ allowed: true }),
    };

    storageClientMock = {
      isConfigured: vi.fn().mockReturnValue(true),
      getBatchUrls: vi.fn().mockReturnValue({ urls: [] }),
    };

    vectorizeServiceMock = {
      queueFromSync: vi.fn().mockResolvedValue({ queued: 0, skipped: 0 }),
    };

    syncCleanupServiceMock = {
      enqueueStorageDeletionRetry: vi.fn().mockResolvedValue(undefined),
    };
    syncStorageDeletionServiceMock = {
      deleteTargetsOnce: vi.fn().mockResolvedValue({
        retryTargets: [],
        skippedTargets: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: VaultService, useValue: vaultServiceMock },
        { provide: QuotaService, useValue: quotaServiceMock },
        { provide: StorageClient, useValue: storageClientMock },
        { provide: VectorizeService, useValue: vectorizeServiceMock },
        { provide: SyncCleanupService, useValue: syncCleanupServiceMock },
        {
          provide: SyncStorageDeletionService,
          useValue: syncStorageDeletionServiceMock,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
  });

  it('returns conflict when deleted item expectedHash mismatches current hash', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-1',
        path: 'a.md',
        contentHash: 'hash-current',
        storageRevision: null,
        size: 100,
      },
    ]);

    const result = await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      completed: [],
      deleted: [{ fileId: 'file-1', expectedHash: 'hash-old' }],
      vectorizeEnabled: false,
    });

    expect(result.success).toBe(false);
    expect(result.conflicts).toEqual([
      {
        fileId: 'file-1',
        path: 'a.md',
        expectedHash: 'hash-old',
        currentHash: 'hash-current',
      },
    ]);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deletes R2 objects after transaction commit', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-1',
        path: 'a.md',
        contentHash: 'hash-1',
        storageRevision: 'revision-1',
        size: 100,
      },
    ]);

    const result = await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      completed: [],
      deleted: [{ fileId: 'file-1' }],
      vectorizeEnabled: false,
    });

    expect(result.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(
      syncStorageDeletionServiceMock.deleteTargetsOnce,
    ).toHaveBeenCalledWith(
      'user-1',
      'vault-1',
      [
        {
          fileId: 'file-1',
          expectedHash: 'hash-1',
          expectedStorageRevision: 'revision-1',
        },
      ],
      'immediate',
    );

    const txOrder = prismaMock.$transaction.mock.invocationCallOrder[0];
    const deleteOrder =
      syncStorageDeletionServiceMock.deleteTargetsOnce.mock
        .invocationCallOrder[0];
    expect(txOrder).toBeLessThan(deleteOrder);
  });

  it('enqueues retry job when safe storage deletion still needs retry', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-1',
        path: 'a.md',
        contentHash: 'hash-1',
        storageRevision: 'revision-1',
        size: 100,
      },
    ]);
    syncStorageDeletionServiceMock.deleteTargetsOnce.mockResolvedValue({
      retryTargets: [
        {
          fileId: 'file-1',
          expectedHash: 'hash-1',
          expectedStorageRevision: 'revision-1',
        },
      ],
      skippedTargets: [],
    });

    const result = await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      completed: [],
      deleted: [{ fileId: 'file-1' }],
      vectorizeEnabled: false,
    });

    expect(result.success).toBe(true);
    expect(
      syncCleanupServiceMock.enqueueStorageDeletionRetry,
    ).toHaveBeenCalledWith('user-1', 'vault-1', [
      {
        fileId: 'file-1',
        expectedHash: 'hash-1',
        expectedStorageRevision: 'revision-1',
      },
    ]);
  });

  it('throws ForbiddenException when fileId belongs to another vault', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-other',
        path: 'a.md',
        contentHash: 'hash-1',
        storageRevision: null,
        size: 100,
      },
    ]);

    await expect(
      service.commitSync('user-1', {
        vaultId: 'vault-1',
        deviceId: 'device-1',
        completed: [
          {
            fileId: 'file-1',
            action: 'upload',
            path: 'a.md',
            title: 'a',
            size: 100,
            contentHash: 'hash-new',
            vectorClock: { device: 1 },
          },
        ],
        deleted: [],
        vectorizeEnabled: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
