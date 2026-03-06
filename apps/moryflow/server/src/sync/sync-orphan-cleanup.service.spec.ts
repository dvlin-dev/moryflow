import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncOrphanCleanupService } from './sync-orphan-cleanup.service';
import type { VaultService } from '../vault';
import type { SyncCleanupService } from './sync-cleanup.service';
import type { SyncStorageDeletionService } from './sync-storage-deletion.service';
import type { SyncObjectVerifyService } from './sync-object-verify.service';

describe('SyncOrphanCleanupService', () => {
  let vaultServiceMock: Pick<VaultService, 'getVault'>;
  let syncCleanupServiceMock: Pick<
    SyncCleanupService,
    'enqueueStorageDeletionRetry'
  >;
  let syncStorageDeletionServiceMock: Pick<
    SyncStorageDeletionService,
    'deleteTargetsOnce'
  >;
  let syncObjectVerifyServiceMock: Pick<
    SyncObjectVerifyService,
    'loadOwnedExistingFiles'
  >;
  let service: SyncOrphanCleanupService;

  beforeEach(() => {
    vaultServiceMock = {
      getVault: vi.fn().mockResolvedValue({ id: 'vault-1' }),
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
    syncObjectVerifyServiceMock = {
      loadOwnedExistingFiles: vi.fn().mockResolvedValue(new Map()),
    };

    service = new SyncOrphanCleanupService(
      vaultServiceMock as VaultService,
      syncCleanupServiceMock as SyncCleanupService,
      syncStorageDeletionServiceMock as SyncStorageDeletionService,
      syncObjectVerifyServiceMock as SyncObjectVerifyService,
    );
  });

  it('skips cleanup for revision still referenced by current sync file', async () => {
    vi.mocked(
      syncObjectVerifyServiceMock.loadOwnedExistingFiles,
    ).mockResolvedValue(
      new Map([
        [
          'file-1',
          {
            fileId: 'file-1',
            path: 'a.md',
            title: 'a',
            contentHash: 'hash-1',
            storageRevision: '550e8400-e29b-41d4-a716-446655440010',
            vectorClock: {},
            size: 10,
            isDeleted: false,
          },
        ],
      ]),
    );

    const result = await service.cleanupOrphans('user-1', {
      vaultId: '550e8400-e29b-41d4-a716-446655440001',
      objects: [
        {
          fileId: 'file-1',
          storageRevision: '550e8400-e29b-41d4-a716-446655440010',
          contentHash: 'hash-1',
        },
      ],
    });

    expect(result).toEqual({
      accepted: true,
      deletedCount: 0,
      retryCount: 0,
      skippedCount: 1,
    });
    expect(
      syncStorageDeletionServiceMock.deleteTargetsOnce,
    ).not.toHaveBeenCalled();
  });

  it('deletes unreferenced orphan revisions and enqueues retry when needed', async () => {
    vi.mocked(
      syncStorageDeletionServiceMock.deleteTargetsOnce,
    ).mockResolvedValue({
      retryTargets: [
        {
          fileId: 'file-2',
          expectedHash: 'hash-2',
          expectedStorageRevision: '550e8400-e29b-41d4-a716-446655440012',
        },
      ],
      skippedTargets: [],
    });

    const result = await service.cleanupOrphans('user-1', {
      vaultId: '550e8400-e29b-41d4-a716-446655440001',
      objects: [
        {
          fileId: 'file-1',
          storageRevision: '550e8400-e29b-41d4-a716-446655440011',
          contentHash: 'hash-1',
        },
        {
          fileId: 'file-2',
          storageRevision: '550e8400-e29b-41d4-a716-446655440012',
          contentHash: 'hash-2',
        },
      ],
    });

    expect(
      syncStorageDeletionServiceMock.deleteTargetsOnce,
    ).toHaveBeenCalledWith(
      'user-1',
      '550e8400-e29b-41d4-a716-446655440001',
      [
        {
          fileId: 'file-1',
          expectedHash: 'hash-1',
          expectedStorageRevision: '550e8400-e29b-41d4-a716-446655440011',
        },
        {
          fileId: 'file-2',
          expectedHash: 'hash-2',
          expectedStorageRevision: '550e8400-e29b-41d4-a716-446655440012',
        },
      ],
      'immediate',
    );
    expect(
      syncCleanupServiceMock.enqueueStorageDeletionRetry,
    ).toHaveBeenCalledWith('user-1', '550e8400-e29b-41d4-a716-446655440001', [
      {
        fileId: 'file-2',
        expectedHash: 'hash-2',
        expectedStorageRevision: '550e8400-e29b-41d4-a716-446655440012',
      },
    ]);
    expect(result).toEqual({
      accepted: true,
      deletedCount: 1,
      retryCount: 1,
      skippedCount: 0,
    });
  });
});
