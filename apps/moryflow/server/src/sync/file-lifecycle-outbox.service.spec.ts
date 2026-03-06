import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FileLifecycleOutboxService,
  type ExistingSyncFileState,
  type PublishedSyncFile,
} from './file-lifecycle-outbox.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

interface UpdateManyCall {
  where: {
    id: { in: string[] };
    processedAt: null;
    leasedBy: string;
  };
  data: {
    processedAt: Date;
    leasedBy: null;
    leaseExpiresAt: null;
  };
}

describe('FileLifecycleOutboxService', () => {
  let prismaMock: MockPrismaService;
  let service: FileLifecycleOutboxService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) =>
        callback(prismaMock),
    );
    service = new FileLifecycleOutboxService(prismaMock as never);
  });

  it('appends upsert and delete events for sync commit', async () => {
    const createMany = vi.fn().mockResolvedValue(undefined);

    const existing = new Map<string, ExistingSyncFileState>([
      [
        'file-1',
        {
          path: 'old.md',
          title: 'old',
          size: 10,
          contentHash: 'hash-old',
          storageRevision: 'revision-old',
          vectorClock: { remote: 1 },
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
          findMany: vi.fn(),
          createMany,
          updateMany: vi.fn(),
        },
      },
      'user-1',
      'vault-1',
      upserts,
      [{ fileId: 'file-1' }],
      existing,
    );

    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('claims oldest unprocessed events with a lease', async () => {
    const now = new Date('2026-03-06T10:00:00.000Z');
    const leaseExpiresAt = new Date(now.getTime() + 30_000);
    prismaMock.fileLifecycleOutbox.findMany
      .mockResolvedValueOnce([
        {
          id: 'evt-1',
          userId: 'user-1',
          vaultId: 'vault-1',
          fileId: 'file-1',
          eventType: 'file_upserted',
          payload: { path: 'a.md' },
          createdAt: new Date('2026-03-06T09:00:00.000Z'),
          processedAt: null,
          leasedBy: null,
          leaseExpiresAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'evt-1',
          userId: 'user-1',
          vaultId: 'vault-1',
          fileId: 'file-1',
          eventType: 'file_upserted',
          payload: { path: 'a.md' },
          createdAt: new Date('2026-03-06T09:00:00.000Z'),
          processedAt: null,
          leasedBy: 'consumer-a',
          leaseExpiresAt,
        },
      ]);
    prismaMock.fileLifecycleOutbox.updateMany.mockResolvedValue({ count: 1 });

    const claimed = await service.claimPendingBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
      now,
    });

    expect(prismaMock.fileLifecycleOutbox.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['evt-1'] },
        processedAt: null,
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
      },
      data: {
        leasedBy: 'consumer-a',
        leaseExpiresAt,
      },
    });
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe('evt-1');
  });

  it('acks only events leased by the same consumer', async () => {
    prismaMock.fileLifecycleOutbox.updateMany.mockResolvedValue({ count: 2 });

    const count = await service.ackClaimedBatch('consumer-a', [
      'evt-1',
      'evt-2',
    ]);

    const updateManyCall = prismaMock.fileLifecycleOutbox.updateMany.mock
      .calls[0]?.[0] as UpdateManyCall | undefined;

    expect(updateManyCall).toMatchObject({
      where: {
        id: { in: ['evt-1', 'evt-2'] },
        processedAt: null,
        leasedBy: 'consumer-a',
      },
      data: {
        leasedBy: null,
        leaseExpiresAt: null,
      },
    });
    expect(updateManyCall?.data?.processedAt).toBeInstanceOf(Date);
    expect(count).toBe(2);
  });
});
