import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SyncStorageDeletionService } from './sync-storage-deletion.service';
import { PrismaService } from '../prisma';
import { StorageClient } from '../storage';

describe('SyncStorageDeletionService', () => {
  let prismaMock: {
    syncFile: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let storageClientMock: {
    headFile: ReturnType<typeof vi.fn>;
    deleteFileIfMatch: ReturnType<typeof vi.fn>;
    downloadStream: ReturnType<typeof vi.fn>;
  };
  let service: SyncStorageDeletionService;

  beforeEach(() => {
    prismaMock = {
      syncFile: {
        findUnique: vi.fn(),
      },
    };
    storageClientMock = {
      headFile: vi.fn(),
      deleteFileIfMatch: vi.fn(),
      downloadStream: vi.fn(),
    };
    service = new SyncStorageDeletionService(
      prismaMock as unknown as PrismaService,
      storageClientMock as unknown as StorageClient,
    );
  });

  it('skips deletion when current object storageRevision mismatches expected revision', async () => {
    storageClientMock.headFile.mockResolvedValue({
      eTag: '"etag-new"',
      metadata: {
        storagerevision: 'revision-new',
      },
    });

    const result = await service.deleteTargetsOnce(
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

    expect(result.retryTargets).toEqual([]);
    expect(result.skippedTargets).toEqual([
      {
        fileId: 'file-1',
        expectedHash: 'hash-old',
        expectedStorageRevision: 'revision-old',
      },
    ]);
    expect(storageClientMock.deleteFileIfMatch).not.toHaveBeenCalled();
  });

  it('deletes object with etag precondition when storageRevision matches', async () => {
    storageClientMock.headFile.mockResolvedValue({
      eTag: '"etag-old"',
      metadata: {
        storagerevision: 'revision-old',
      },
    });
    storageClientMock.deleteFileIfMatch.mockResolvedValue('deleted');

    const result = await service.deleteTargetsOnce(
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

    expect(result.retryTargets).toEqual([]);
    expect(result.skippedTargets).toEqual([]);
    expect(storageClientMock.deleteFileIfMatch).toHaveBeenCalledWith(
      'user-1',
      'vault-1',
      'file-1',
      '"etag-old"',
    );
  });

  it('routes legacy target to retry queue during immediate delete', async () => {
    const target = {
      fileId: 'file-legacy',
      expectedHash: 'hash-legacy',
      expectedStorageRevision: null,
    };

    const result = await service.deleteTargetsOnce(
      'user-1',
      'vault-1',
      [target],
      'immediate',
    );

    expect(result.retryTargets).toEqual([target]);
    expect(result.skippedTargets).toEqual([]);
    expect(storageClientMock.headFile).not.toHaveBeenCalled();
  });

  it('skips legacy cleanup when file has been recreated in database', async () => {
    prismaMock.syncFile.findUnique.mockResolvedValue({
      isDeleted: false,
      contentHash: 'hash-legacy',
    });

    const result = await service.deleteTargetsOnce(
      'user-1',
      'vault-1',
      [
        {
          fileId: 'file-legacy',
          expectedHash: 'hash-legacy',
          expectedStorageRevision: null,
        },
      ],
      'retry',
    );

    expect(result.retryTargets).toEqual([]);
    expect(result.skippedTargets).toEqual([
      {
        fileId: 'file-legacy',
        expectedHash: 'hash-legacy',
        expectedStorageRevision: null,
      },
    ]);
    expect(storageClientMock.deleteFileIfMatch).not.toHaveBeenCalled();
  });

  it('deletes legacy object on retry when tombstone still matches current hash', async () => {
    prismaMock.syncFile.findUnique.mockResolvedValue({
      isDeleted: true,
      contentHash: 'hash-legacy',
    });
    storageClientMock.headFile.mockResolvedValue({
      eTag: '"etag-legacy"',
      metadata: {
        contenthash: 'hash-legacy',
      },
    });
    storageClientMock.deleteFileIfMatch.mockResolvedValue('deleted');

    const result = await service.deleteTargetsOnce(
      'user-1',
      'vault-1',
      [
        {
          fileId: 'file-legacy',
          expectedHash: 'hash-legacy',
          expectedStorageRevision: null,
        },
      ],
      'retry',
    );

    expect(result.retryTargets).toEqual([]);
    expect(result.skippedTargets).toEqual([]);
    expect(storageClientMock.deleteFileIfMatch).toHaveBeenCalledWith(
      'user-1',
      'vault-1',
      'file-legacy',
      '"etag-legacy"',
    );
  });
});
