import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';
import { SyncPlanService } from './sync-plan.service';
import { SyncUploadContractService } from './sync-upload-contract.service';
import { SyncObjectVerifyService } from './sync-object-verify.service';
import { SyncCommitService } from './sync-commit.service';
import { SyncOrphanCleanupService } from './sync-orphan-cleanup.service';
import {
  SyncActionTokenService,
  type SyncActionTokenUnsignedClaims,
} from './sync-action-token.service';
import { SyncCleanupService } from './sync-cleanup.service';
import { FileLifecycleOutboxWriterService } from './file-lifecycle-outbox-writer.service';
import { SyncStorageDeletionService } from './sync-storage-deletion.service';
import { SyncTelemetryService } from './sync-telemetry.service';
import { PrismaService } from '../prisma';
import { VaultService } from '../vault';
import { QuotaService } from '../quota';
import { StorageClient } from '../storage';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('SyncService.commitSync', () => {
  let service: SyncService;
  let prismaMock: MockPrismaService;
  let tokenService: SyncActionTokenService;
  let vaultServiceMock: { getVault: ReturnType<typeof vi.fn> };
  let quotaServiceMock: {
    checkFileSizeAllowed: ReturnType<typeof vi.fn>;
    checkStorageAllowed: ReturnType<typeof vi.fn>;
  };
  let storageClientMock: {
    isConfigured: ReturnType<typeof vi.fn>;
    getBatchUrls: ReturnType<typeof vi.fn>;
    headSyncFile: ReturnType<typeof vi.fn>;
  };
  let syncCleanupServiceMock: {
    enqueueStorageDeletionRetry: ReturnType<typeof vi.fn>;
  };
  let syncStorageDeletionServiceMock: {
    deleteTargetsOnce: ReturnType<typeof vi.fn>;
  };

  const issueReceipt = (claims: SyncActionTokenUnsignedClaims) => ({
    actionId: claims.actionId,
    receiptToken: tokenService.issueReceiptToken(claims),
  });

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
      headSyncFile: vi.fn().mockResolvedValue(null),
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
        SyncPlanService,
        SyncUploadContractService,
        SyncObjectVerifyService,
        SyncCommitService,
        SyncOrphanCleanupService,
        SyncActionTokenService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: string) => {
              if (key === 'SYNC_ACTION_SECRET') return 'test-sync-secret';
              return fallback;
            },
          },
        },
        { provide: PrismaService, useValue: prismaMock },
        { provide: VaultService, useValue: vaultServiceMock },
        { provide: QuotaService, useValue: quotaServiceMock },
        { provide: StorageClient, useValue: storageClientMock },
        { provide: SyncCleanupService, useValue: syncCleanupServiceMock },
        FileLifecycleOutboxWriterService,
        SyncTelemetryService,
        {
          provide: SyncStorageDeletionService,
          useValue: syncStorageDeletionServiceMock,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    tokenService = module.get<SyncActionTokenService>(SyncActionTokenService);
  });

  it('returns conflict when delete receipt expectedHash mismatches current hash', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-1',
        path: 'a.md',
        title: 'a',
        contentHash: 'hash-current',
        storageRevision: 'revision-current',
        vectorClock: { remote: 2 },
        isDeleted: false,
        size: 100,
      },
    ]);

    const result = await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      receipts: [
        issueReceipt({
          userId: 'user-1',
          vaultId: 'vault-1',
          deviceId: 'device-1',
          actionId: '550e8400-e29b-41d4-a716-446655440010',
          action: 'delete',
          file: {
            fileId: 'file-1',
            path: 'a.md',
            title: 'a',
            size: 100,
            contentHash: 'hash-old',
            storageRevision: 'revision-old',
            vectorClock: { device: 1 },
            expectedHash: 'hash-old',
            expectedStorageRevision: 'revision-old',
            expectedVectorClock: { remote: 1 },
          },
        }),
      ],
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

  it('deletes superseded sync revisions after upload commit', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-1',
        path: 'a.md',
        title: 'a',
        contentHash: 'hash-old',
        storageRevision: 'revision-old',
        vectorClock: { remote: 1 },
        isDeleted: false,
        size: 100,
      },
    ]);
    storageClientMock.headSyncFile.mockResolvedValue({
      eTag: '"etag-new"',
      metadata: {
        storagerevision: 'revision-new',
        contenthash: 'hash-new',
      },
    });

    const result = await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      receipts: [
        issueReceipt({
          userId: 'user-1',
          vaultId: 'vault-1',
          deviceId: 'device-1',
          actionId: '550e8400-e29b-41d4-a716-446655440011',
          action: 'upload',
          file: {
            fileId: 'file-1',
            path: 'a.md',
            title: 'a',
            size: 120,
            contentHash: 'hash-new',
            storageRevision: 'revision-new',
            vectorClock: { device: 2 },
            expectedHash: 'hash-old',
            expectedStorageRevision: 'revision-old',
            expectedVectorClock: { remote: 1 },
          },
        }),
      ],
    });

    expect(result.success).toBe(true);
    expect(
      syncStorageDeletionServiceMock.deleteTargetsOnce,
    ).toHaveBeenCalledWith(
      'user-1',
      'vault-1',
      [
        {
          fileId: 'file-1',
          expectedHash: 'hash-old',
          expectedStorageRevision: 'revision-old',
        },
      ],
      'immediate',
    );
  });

  it('enqueues retry job when sync revision cleanup needs retry', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-1',
        path: 'a.md',
        title: 'a',
        contentHash: 'hash-old',
        storageRevision: 'revision-old',
        vectorClock: { remote: 1 },
        isDeleted: false,
        size: 100,
      },
    ]);
    storageClientMock.headSyncFile.mockResolvedValue({
      eTag: '"etag-new"',
      metadata: {
        storagerevision: 'revision-new',
        contenthash: 'hash-new',
      },
    });
    syncStorageDeletionServiceMock.deleteTargetsOnce.mockResolvedValue({
      retryTargets: [
        {
          fileId: 'file-1',
          expectedHash: 'hash-old',
          expectedStorageRevision: 'revision-old',
        },
      ],
      skippedTargets: [],
    });

    const result = await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      receipts: [
        issueReceipt({
          userId: 'user-1',
          vaultId: 'vault-1',
          deviceId: 'device-1',
          actionId: '550e8400-e29b-41d4-a716-446655440012',
          action: 'upload',
          file: {
            fileId: 'file-1',
            path: 'a.md',
            title: 'a',
            size: 120,
            contentHash: 'hash-new',
            storageRevision: 'revision-new',
            vectorClock: { device: 2 },
            expectedHash: 'hash-old',
            expectedStorageRevision: 'revision-old',
            expectedVectorClock: { remote: 1 },
          },
        }),
      ],
    });

    expect(result.success).toBe(true);
    expect(
      syncCleanupServiceMock.enqueueStorageDeletionRetry,
    ).toHaveBeenCalledWith('user-1', 'vault-1', [
      {
        fileId: 'file-1',
        expectedHash: 'hash-old',
        expectedStorageRevision: 'revision-old',
      },
    ]);
  });

  it('throws ForbiddenException when fileId belongs to another vault', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-other',
        path: 'a.md',
        title: 'a',
        contentHash: 'hash-old',
        storageRevision: 'revision-old',
        vectorClock: { remote: 1 },
        isDeleted: false,
        size: 100,
      },
    ]);
    storageClientMock.headSyncFile.mockResolvedValue({
      eTag: '"etag-new"',
      metadata: {
        storagerevision: 'revision-new',
        contenthash: 'hash-new',
      },
    });

    await expect(
      service.commitSync('user-1', {
        vaultId: 'vault-1',
        deviceId: 'device-1',
        receipts: [
          issueReceipt({
            userId: 'user-1',
            vaultId: 'vault-1',
            deviceId: 'device-1',
            actionId: '550e8400-e29b-41d4-a716-446655440013',
            action: 'upload',
            file: {
              fileId: 'file-1',
              path: 'a.md',
              title: 'a',
              size: 120,
              contentHash: 'hash-new',
              storageRevision: 'revision-new',
              vectorClock: { device: 2 },
              expectedHash: 'hash-old',
              expectedStorageRevision: 'revision-old',
              expectedVectorClock: { remote: 1 },
            },
          }),
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('writes file lifecycle outbox entries after receipt commit succeeds', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-1',
        path: 'before.md',
        title: 'before',
        contentHash: 'hash-old',
        storageRevision: 'revision-old',
        vectorClock: { remote: 1 },
        isDeleted: false,
        size: 100,
      },
      {
        id: 'file-2',
        vaultId: 'vault-1',
        path: 'deleted.md',
        title: 'deleted',
        contentHash: 'hash-delete',
        storageRevision: 'revision-delete',
        vectorClock: { remote: 1 },
        isDeleted: false,
        size: 20,
      },
    ]);
    storageClientMock.headSyncFile.mockResolvedValue({
      eTag: '"etag-new"',
      metadata: {
        storagerevision: 'revision-new',
        contenthash: 'hash-new',
      },
    });

    await service.commitSync('user-1', {
      vaultId: 'vault-1',
      deviceId: 'device-1',
      receipts: [
        issueReceipt({
          userId: 'user-1',
          vaultId: 'vault-1',
          deviceId: 'device-1',
          actionId: '550e8400-e29b-41d4-a716-446655440014',
          action: 'upload',
          file: {
            fileId: 'file-1',
            path: 'after.md',
            title: 'after',
            size: 120,
            contentHash: 'hash-new',
            storageRevision: 'revision-new',
            vectorClock: { device: 2 },
            expectedHash: 'hash-old',
            expectedStorageRevision: 'revision-old',
            expectedVectorClock: { remote: 1 },
          },
        }),
        issueReceipt({
          userId: 'user-1',
          vaultId: 'vault-1',
          deviceId: 'device-1',
          actionId: '550e8400-e29b-41d4-a716-446655440015',
          action: 'delete',
          file: {
            fileId: 'file-2',
            path: 'deleted.md',
            title: 'deleted',
            size: 20,
            contentHash: 'hash-delete',
            storageRevision: 'revision-delete',
            vectorClock: { device: 3 },
            expectedHash: 'hash-delete',
            expectedStorageRevision: 'revision-delete',
            expectedVectorClock: { remote: 1 },
          },
        }),
      ],
    });

    expect(prismaMock.fileLifecycleOutbox.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'user-1',
          vaultId: 'vault-1',
          fileId: 'file-1',
          eventType: 'file_upserted',
        }),
        expect.objectContaining({
          userId: 'user-1',
          vaultId: 'vault-1',
          fileId: 'file-2',
          eventType: 'file_deleted',
        }),
      ],
    });
  });

  it('rejects duplicate actionId receipts even if dto validation is bypassed', async () => {
    await expect(
      service.commitSync('user-1', {
        vaultId: 'vault-1',
        deviceId: 'device-1',
        receipts: [
          issueReceipt({
            userId: 'user-1',
            vaultId: 'vault-1',
            deviceId: 'device-1',
            actionId: '550e8400-e29b-41d4-a716-446655440016',
            action: 'delete',
            file: {
              fileId: 'file-1',
              path: 'a.md',
              title: 'a',
              size: 100,
              contentHash: 'hash-old',
              storageRevision: 'revision-old',
              vectorClock: { device: 1 },
              expectedHash: 'hash-old',
              expectedStorageRevision: 'revision-old',
              expectedVectorClock: { remote: 1 },
            },
          }),
          issueReceipt({
            userId: 'user-1',
            vaultId: 'vault-1',
            deviceId: 'device-1',
            actionId: '550e8400-e29b-41d4-a716-446655440016',
            action: 'delete',
            file: {
              fileId: 'file-2',
              path: 'b.md',
              title: 'b',
              size: 100,
              contentHash: 'hash-old',
              storageRevision: 'revision-old',
              vectorClock: { device: 1 },
              expectedHash: 'hash-old',
              expectedStorageRevision: 'revision-old',
              expectedVectorClock: { remote: 1 },
            },
          }),
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects duplicate file receipts even when actionIds are different', async () => {
    await expect(
      service.commitSync('user-1', {
        vaultId: 'vault-1',
        deviceId: 'device-1',
        receipts: [
          issueReceipt({
            userId: 'user-1',
            vaultId: 'vault-1',
            deviceId: 'device-1',
            actionId: '550e8400-e29b-41d4-a716-4466554400aa',
            action: 'delete',
            file: {
              fileId: 'file-1',
              path: 'a.md',
              title: 'a',
              size: 100,
              contentHash: 'hash-old',
              storageRevision: 'revision-old',
              vectorClock: { device: 1 },
              expectedHash: 'hash-old',
              expectedStorageRevision: 'revision-old',
              expectedVectorClock: { remote: 1 },
            },
          }),
          issueReceipt({
            userId: 'user-1',
            vaultId: 'vault-1',
            deviceId: 'device-1',
            actionId: '550e8400-e29b-41d4-a716-4466554400ab',
            action: 'delete',
            file: {
              fileId: 'file-1',
              path: 'a.md',
              title: 'a',
              size: 100,
              contentHash: 'hash-old',
              storageRevision: 'revision-old',
              vectorClock: { device: 1 },
              expectedHash: 'hash-old',
              expectedStorageRevision: 'revision-old',
              expectedVectorClock: { remote: 1 },
            },
          }),
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns conflict exception when receipt token is expired', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T00:00:00.000Z'));

    const expiredReceipt = issueReceipt({
      userId: 'user-1',
      vaultId: 'vault-1',
      deviceId: 'device-1',
      actionId: '550e8400-e29b-41d4-a716-446655440017',
      action: 'delete',
      file: {
        fileId: 'file-1',
        path: 'a.md',
        title: 'a',
        size: 100,
        contentHash: 'hash-old',
        storageRevision: 'revision-old',
        vectorClock: { device: 1 },
        expectedHash: 'hash-old',
        expectedStorageRevision: 'revision-old',
        expectedVectorClock: { remote: 1 },
      },
    });

    vi.advanceTimersByTime(901_000);

    await expect(
      service.commitSync('user-1', {
        vaultId: 'vault-1',
        deviceId: 'device-1',
        receipts: [expiredReceipt],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('returns not found exception when uploaded object is missing', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([]);
    storageClientMock.headSyncFile.mockResolvedValue(null);

    try {
      await service.commitSync('user-1', {
        vaultId: 'vault-1',
        deviceId: 'device-1',
        receipts: [
          issueReceipt({
            userId: 'user-1',
            vaultId: 'vault-1',
            deviceId: 'device-1',
            actionId: '550e8400-e29b-41d4-a716-446655440018',
            action: 'upload',
            file: {
              fileId: 'file-new',
              path: 'missing.md',
              title: 'missing',
              size: 12,
              contentHash: 'hash-new',
              storageRevision: '550e8400-e29b-41d4-a716-446655440019',
              vectorClock: { device: 1 },
            },
          }),
        ],
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(404);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'SYNC_UPLOADED_OBJECT_NOT_FOUND',
      });
    }

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns conflict exception when uploaded object contract mismatches', async () => {
    prismaMock.syncFile.findMany.mockResolvedValue([]);
    storageClientMock.headSyncFile.mockResolvedValue({
      eTag: '"etag-new"',
      metadata: {
        storagerevision: '550e8400-e29b-41d4-a716-446655440021',
        contenthash: 'hash-drifted',
      },
    });

    try {
      await service.commitSync('user-1', {
        vaultId: 'vault-1',
        deviceId: 'device-1',
        receipts: [
          issueReceipt({
            userId: 'user-1',
            vaultId: 'vault-1',
            deviceId: 'device-1',
            actionId: '550e8400-e29b-41d4-a716-446655440020',
            action: 'upload',
            file: {
              fileId: 'file-new',
              path: 'drifted.md',
              title: 'drifted',
              size: 12,
              contentHash: 'hash-expected',
              storageRevision: '550e8400-e29b-41d4-a716-446655440021',
              vectorClock: { device: 1 },
            },
          }),
        ],
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(409);
      expect((error as HttpException).getResponse()).toMatchObject({
        code: 'SYNC_UPLOADED_OBJECT_CONTRACT_MISMATCH',
      });
    }

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
