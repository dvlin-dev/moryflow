import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoxCutoverService } from './memox-cutover.service';
import type { PrismaService } from '../prisma';
import type { RedisService } from '../redis';
import type { MemoxOutboxConsumerService } from './memox-outbox-consumer.service';
import type { MemoxFileProjectionService } from './memox-file-projection.service';
import type { MemoxSearchAdapterService } from './memox-search-adapter.service';
import type { LegacyVectorSearchClient } from './legacy-vector-search.client';

describe('MemoxCutoverService', () => {
  let prisma: {
    syncFile: {
      findMany: ReturnType<typeof vi.fn>;
    };
    fileLifecycleOutbox: {
      count: ReturnType<typeof vi.fn>;
    };
  };
  let redis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let consumer: {
    processBatch: ReturnType<typeof vi.fn>;
  };
  let projectionService: {
    upsertFile: ReturnType<typeof vi.fn>;
  };
  let memoxSearchAdapter: {
    searchFiles: ReturnType<typeof vi.fn>;
  };
  let legacyVectorSearchClient: {
    query: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    prisma = {
      syncFile: {
        findMany: vi.fn(),
      },
      fileLifecycleOutbox: {
        count: vi.fn().mockResolvedValue(0),
      },
    };
    redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };
    consumer = {
      processBatch: vi.fn(),
    };
    projectionService = {
      upsertFile: vi.fn().mockResolvedValue(undefined),
    };
    memoxSearchAdapter = {
      searchFiles: vi.fn(),
    };
    legacyVectorSearchClient = {
      query: vi.fn(),
    };
  });

  it('backfills active sync files with deterministic event ids and persists the next cursor', async () => {
    prisma.syncFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        vaultId: 'vault-1',
        path: '/Doc.md',
        title: 'Doc',
        contentHash: 'hash-1',
        storageRevision: 'rev-1',
        updatedAt: new Date('2026-03-07T00:00:00.000Z'),
        vault: {
          userId: 'user-1',
        },
      },
    ]);
    const service = new MemoxCutoverService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      consumer as unknown as MemoxOutboxConsumerService,
      projectionService as unknown as MemoxFileProjectionService,
      memoxSearchAdapter as unknown as MemoxSearchAdapterService,
      legacyVectorSearchClient as unknown as LegacyVectorSearchClient,
    );

    const result = await service.backfillBatch({
      batchSize: 50,
    });

    expect(projectionService.upsertFile).toHaveBeenCalledWith({
      eventId: 'memox-backfill:file-1:rev-1:upsert',
      userId: 'user-1',
      vaultId: 'vault-1',
      fileId: 'file-1',
      path: '/Doc.md',
      title: 'Doc',
      contentHash: 'hash-1',
      storageRevision: 'rev-1',
      previousContentHash: null,
      previousStorageRevision: null,
    });
    expect(redis.set).toHaveBeenCalledOnce();
    const firstSetCall = redis.set.mock.calls[0];
    expect(firstSetCall).toBeDefined();
    const savedState: unknown = firstSetCall?.[1];
    expect(typeof savedState).toBe('string');
    if (typeof savedState !== 'string') {
      throw new Error('redis.set payload must be string');
    }
    expect(JSON.parse(savedState)).toMatchObject({
      processedCount: 1,
      cursor: {
        fileId: 'file-1',
        updatedAt: '2026-03-07T00:00:00.000Z',
      },
      status: 'completed',
    });
    expect(result).toMatchObject({
      scanned: 1,
      processed: 1,
      done: true,
      nextCursor: {
        fileId: 'file-1',
        updatedAt: '2026-03-07T00:00:00.000Z',
      },
    });
  });

  it('replays the outbox until the backlog is empty', async () => {
    consumer.processBatch
      .mockResolvedValueOnce({
        claimed: 2,
        acknowledged: 2,
        failedIds: [],
        deadLetteredIds: [],
      })
      .mockResolvedValueOnce({
        claimed: 0,
        acknowledged: 0,
        failedIds: [],
        deadLetteredIds: [],
      });
    const service = new MemoxCutoverService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      consumer as unknown as MemoxOutboxConsumerService,
      projectionService as unknown as MemoxFileProjectionService,
      memoxSearchAdapter as unknown as MemoxSearchAdapterService,
      legacyVectorSearchClient as unknown as LegacyVectorSearchClient,
    );

    const result = await service.replayOutbox({
      batchSize: 20,
      maxBatches: 5,
      leaseMs: 30000,
    });

    expect(consumer.processBatch).toHaveBeenCalledTimes(2);
    expect(prisma.fileLifecycleOutbox.count).toHaveBeenCalledWith({
      where: {
        processedAt: null,
      },
    });
    expect(result).toMatchObject({
      batches: 2,
      claimed: 2,
      acknowledged: 2,
      failedIds: [],
      deadLetteredIds: [],
      drained: true,
    });
  });

  it('marks replay as drained when the last allowed batch clears the backlog', async () => {
    consumer.processBatch.mockResolvedValueOnce({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
    prisma.fileLifecycleOutbox.count.mockResolvedValue(0);
    const service = new MemoxCutoverService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      consumer as unknown as MemoxOutboxConsumerService,
      projectionService as unknown as MemoxFileProjectionService,
      memoxSearchAdapter as unknown as MemoxSearchAdapterService,
      legacyVectorSearchClient as unknown as LegacyVectorSearchClient,
    );

    const result = await service.replayOutbox({
      batchSize: 20,
      maxBatches: 1,
      leaseMs: 30_000,
    });

    expect(result).toMatchObject({
      batches: 1,
      claimed: 1,
      acknowledged: 1,
      drained: true,
    });
  });

  it('builds a drift report from legacy vector search and Memox search', async () => {
    legacyVectorSearchClient.query.mockResolvedValue([
      {
        id: 'file-legacy',
        score: 0.91,
        metadata: { title: 'Legacy' },
      },
    ]);
    prisma.syncFile.findMany
      .mockResolvedValueOnce([
        {
          id: 'file-legacy',
          title: 'Legacy',
          path: '/Legacy.md',
          vaultId: 'vault-1',
          isDeleted: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'file-legacy',
          title: 'Legacy',
          path: '/Legacy.md',
          vaultId: 'vault-1',
          isDeleted: false,
        },
      ]);
    memoxSearchAdapter.searchFiles.mockResolvedValue({
      results: [
        {
          fileId: 'file-legacy',
          vaultId: 'vault-1',
          title: 'Legacy',
          path: '/Legacy.md',
          snippet: 'Legacy snippet',
          score: 0.93,
        },
      ],
      count: 1,
    });
    const service = new MemoxCutoverService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      consumer as unknown as MemoxOutboxConsumerService,
      projectionService as unknown as MemoxFileProjectionService,
      memoxSearchAdapter as unknown as MemoxSearchAdapterService,
      legacyVectorSearchClient as unknown as LegacyVectorSearchClient,
    );

    const report = await service.shadowCompare({
      userId: 'user-1',
      topK: 5,
      queries: [
        {
          query: 'legacy',
          vaultId: 'vault-1',
          expectedFileIds: ['file-legacy'],
        },
      ],
    });

    expect(legacyVectorSearchClient.query).toHaveBeenCalledWith(
      'user-1',
      'legacy',
      {
        topK: 5,
        namespace: 'user:user-1',
        filter: {
          vaultId: 'vault-1',
        },
      },
    );
    expect(report).toMatchObject({
      totalQueries: 1,
      expectedHitRate: 1,
      deletedLeakCount: 0,
      pathMismatchCount: 0,
    });
    expect(report.queries[0]).toMatchObject({
      legacyFileIds: ['file-legacy'],
      memoxFileIds: ['file-legacy'],
      expectedHit: true,
    });
  });

  it('does not mark replay drained while unprocessed outbox rows still exist', async () => {
    consumer.processBatch.mockResolvedValueOnce({
      claimed: 0,
      acknowledged: 0,
      failedIds: [],
      deadLetteredIds: [],
    });
    prisma.fileLifecycleOutbox.count.mockResolvedValue(1);
    const service = new MemoxCutoverService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      consumer as unknown as MemoxOutboxConsumerService,
      projectionService as unknown as MemoxFileProjectionService,
      memoxSearchAdapter as unknown as MemoxSearchAdapterService,
      legacyVectorSearchClient as unknown as LegacyVectorSearchClient,
    );

    const result = await service.replayOutbox({
      batchSize: 20,
      maxBatches: 1,
      leaseMs: 30000,
    });

    expect(result.drained).toBe(false);
  });

  it('keeps replay non-drained when poison events are dead-lettered', async () => {
    consumer.processBatch
      .mockResolvedValueOnce({
        claimed: 1,
        acknowledged: 0,
        failedIds: ['evt-fail'],
        deadLetteredIds: ['evt-fail'],
      })
      .mockResolvedValueOnce({
        claimed: 0,
        acknowledged: 0,
        failedIds: [],
        deadLetteredIds: [],
      });
    prisma.fileLifecycleOutbox.count.mockResolvedValue(1);
    const service = new MemoxCutoverService(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      consumer as unknown as MemoxOutboxConsumerService,
      projectionService as unknown as MemoxFileProjectionService,
      memoxSearchAdapter as unknown as MemoxSearchAdapterService,
      legacyVectorSearchClient as unknown as LegacyVectorSearchClient,
    );

    const result = await service.replayOutbox({
      batchSize: 20,
      maxBatches: 5,
      leaseMs: 30000,
    });

    expect(result).toMatchObject({
      failedIds: ['evt-fail'],
      deadLetteredIds: ['evt-fail'],
      drained: false,
    });
  });
});
