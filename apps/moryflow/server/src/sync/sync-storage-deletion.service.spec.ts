import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SyncStorageDeletionService } from './sync-storage-deletion.service';
import { StorageClient } from '../storage';

describe('SyncStorageDeletionService', () => {
  let storageClientMock: {
    headSyncFile: ReturnType<typeof vi.fn>;
    deleteSyncFileIfMatch: ReturnType<typeof vi.fn>;
  };
  let service: SyncStorageDeletionService;

  beforeEach(() => {
    storageClientMock = {
      headSyncFile: vi.fn(),
      deleteSyncFileIfMatch: vi.fn(),
    };
    service = new SyncStorageDeletionService(
      storageClientMock as unknown as StorageClient,
    );
  });

  it('skips deletion when current object storageRevision mismatches expected revision', async () => {
    storageClientMock.headSyncFile.mockResolvedValue({
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
    expect(storageClientMock.deleteSyncFileIfMatch).not.toHaveBeenCalled();
  });

  it('deletes object with etag precondition when storageRevision matches', async () => {
    storageClientMock.headSyncFile.mockResolvedValue({
      eTag: '"etag-old"',
      metadata: {
        storagerevision: 'revision-old',
      },
    });
    storageClientMock.deleteSyncFileIfMatch.mockResolvedValue('deleted');

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
    expect(storageClientMock.deleteSyncFileIfMatch).toHaveBeenCalledWith(
      'user-1',
      'vault-1',
      'file-1',
      'revision-old',
      '"etag-old"',
    );
  });

  it('skips deletion when revision is missing', async () => {
    const target = {
      fileId: 'file-1',
      expectedHash: 'hash-old',
      expectedStorageRevision: null,
    };

    const result = await service.deleteTargetsOnce(
      'user-1',
      'vault-1',
      [target],
      'immediate',
    );

    expect(result.retryTargets).toEqual([]);
    expect(result.skippedTargets).toEqual([target]);
    expect(storageClientMock.headSyncFile).not.toHaveBeenCalled();
  });
});
