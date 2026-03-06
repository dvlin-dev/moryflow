import { describe, expect, it, vi } from 'vitest';
import { SyncCleanupProcessor } from './sync-cleanup.processor';
import { SyncStorageDeletionService } from './sync-storage-deletion.service';

describe('SyncCleanupProcessor', () => {
  it('throws so BullMQ can retry when safe deletion still returns retryTargets', async () => {
    const deletionServiceMock = {
      deleteTargetsOnce: vi.fn().mockResolvedValue({
        retryTargets: [
          {
            fileId: 'file-1',
            expectedHash: 'hash-1',
            expectedStorageRevision: 'revision-1',
          },
        ],
        skippedTargets: [],
      }),
    } as unknown as SyncStorageDeletionService;
    const processor = new SyncCleanupProcessor(deletionServiceMock);

    await expect(
      processor.process({
        data: {
          userId: 'user-1',
          vaultId: 'vault-1',
          targets: [
            {
              fileId: 'file-1',
              expectedHash: 'hash-1',
              expectedStorageRevision: 'revision-1',
            },
          ],
        },
      } as never),
    ).rejects.toThrow('Failed to delete files from storage safely');
  });

  it('completes when safe deletion succeeds without retryTargets', async () => {
    const deletionServiceMock = {
      deleteTargetsOnce: vi.fn().mockResolvedValue({
        retryTargets: [],
        skippedTargets: [],
      }),
    } as unknown as SyncStorageDeletionService;
    const processor = new SyncCleanupProcessor(deletionServiceMock);

    await expect(
      processor.process({
        data: {
          userId: 'user-1',
          vaultId: 'vault-1',
          targets: [
            {
              fileId: 'file-1',
              expectedHash: 'hash-1',
              expectedStorageRevision: 'revision-1',
            },
          ],
        },
      } as never),
    ).resolves.toBeUndefined();
  });
});
