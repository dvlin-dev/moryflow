import { describe, expect, it, vi } from 'vitest';
import {
  FileLifecycleOutboxWriterService,
  type ExistingSyncFileState,
  type PublishedSyncFile,
} from './file-lifecycle-outbox-writer.service';

describe('FileLifecycleOutboxWriterService', () => {
  const service = new FileLifecycleOutboxWriterService();

  it('emits file_upserted and file_deleted events from sync commit truth', async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 2 });
    const existing = new Map<string, ExistingSyncFileState>([
      [
        'file-1',
        {
          path: 'old.md',
          title: 'old',
          size: 10,
          contentHash: 'hash-old',
          storageRevision: 'revision-old',
          vectorClock: { device: 1 },
          isDeleted: false,
        },
      ],
    ]);
    const upserts: PublishedSyncFile[] = [
      {
        fileId: 'file-1',
        path: 'new.md',
        title: 'new',
        size: 20,
        contentHash: 'hash-new',
        storageRevision: 'revision-new',
        vectorClock: { device: 2 },
      },
    ];

    await service.appendSyncCommitEvents(
      {
        fileLifecycleOutbox: {
          createMany,
        },
      },
      'user-1',
      'vault-1',
      upserts,
      [{ fileId: 'file-1' }],
      existing,
    );

    expect(createMany).toHaveBeenCalledTimes(1);
    const createManyCall = createMany.mock.calls[0]?.[0] as
      | {
          data: Array<{
            fileId: string;
            eventType: string;
            payload: Record<string, unknown>;
          }>;
        }
      | undefined;
    expect(createManyCall?.data).toHaveLength(2);
    expect(createManyCall?.data[0]).toMatchObject({
      fileId: 'file-1',
      eventType: 'file_upserted',
      payload: {
        path: 'new.md',
        title: 'new',
        size: 20,
        contentHash: 'hash-new',
        storageRevision: 'revision-new',
        previousPath: 'old.md',
        previousContentHash: 'hash-old',
        previousStorageRevision: 'revision-old',
      },
    });
    expect(createManyCall?.data[1]).toMatchObject({
      fileId: 'file-1',
      eventType: 'file_deleted',
      payload: {
        path: 'old.md',
        contentHash: 'hash-old',
        storageRevision: 'revision-old',
      },
    });
  });
});
