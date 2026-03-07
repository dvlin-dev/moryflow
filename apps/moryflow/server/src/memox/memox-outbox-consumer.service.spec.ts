import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoxOutboxConsumerService } from './memox-outbox-consumer.service';
import { MemoxFileProjectionService } from './memox-file-projection.service';
import type { PrismaService } from '../prisma';
import type { FileLifecycleOutboxLeaseService } from '../sync/file-lifecycle-outbox-lease.service';
import type { MemoxClient } from './memox.client';
import { MemoxGatewayError } from './memox.client';
import type { LegacyVectorSearchClient } from './legacy-vector-search.client';
import type { MemoxRuntimeConfigService } from './memox-runtime-config.service';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import type { StorageClient } from '../storage';

const HELLO_WORLD_HASH =
  'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
const UPDATED_CONTENT_HASH =
  '9a29ebdf54e75363184478c0e7ec809b2aaa764fa080b3cf8fd6c11f7bd83a49';
const OLD_CONTENT_HASH =
  'efe5df377a4fffff54a5362fa31652faae12ff0a6e2f8b9d4af4b5869a989b04';

describe('MemoxOutboxConsumerService', () => {
  let outboxService: {
    claimPendingBatch: ReturnType<typeof vi.fn>;
    ackClaimedBatch: ReturnType<typeof vi.fn>;
    failClaimedEvent: ReturnType<typeof vi.fn>;
  };
  let memoxClient: {
    resolveSourceIdentity: ReturnType<typeof vi.fn>;
    createSourceRevision: ReturnType<typeof vi.fn>;
    finalizeSourceRevision: ReturnType<typeof vi.fn>;
    deleteSource: ReturnType<typeof vi.fn>;
  };
  let legacyVectorSearchClient: {
    upsertFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  };
  let storageClient: {
    downloadSyncStream: ReturnType<typeof vi.fn>;
  };
  let runtimeConfigService: {
    isLegacyVectorBaselineEnabled: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    syncFile: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    outboxService = {
      claimPendingBatch: vi.fn(),
      ackClaimedBatch: vi.fn().mockResolvedValue(0),
      failClaimedEvent: vi.fn().mockResolvedValue({
        state: 'retry_scheduled',
        retryAt: new Date('2026-03-07T00:00:05.000Z'),
      }),
    };
    memoxClient = {
      resolveSourceIdentity: vi.fn(),
      createSourceRevision: vi.fn(),
      finalizeSourceRevision: vi.fn(),
      deleteSource: vi.fn(),
    };
    legacyVectorSearchClient = {
      upsertFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };
    storageClient = {
      downloadSyncStream: vi
        .fn()
        .mockImplementation(
          (
            _userId: string,
            _vaultId: string,
            _fileId: string,
            storageRevision: string,
          ) => {
            const snapshot = resolveSnapshot(storageRevision);
            return {
              stream: Readable.from(Buffer.from(snapshot.content)),
              metadata: {
                contenthash: snapshot.hash,
                storagerevision: storageRevision,
              },
            };
          },
        ),
    };
    runtimeConfigService = {
      isLegacyVectorBaselineEnabled: vi.fn().mockReturnValue(false),
    };
    prisma = {
      syncFile: {
        findFirst: vi.fn().mockResolvedValue({
          isDeleted: false,
          path: '/Doc.md',
          title: 'Doc',
          contentHash: HELLO_WORLD_HASH,
          storageRevision: 'rev-1',
        }),
      },
    };
  });

  const createProjectionService = () =>
    new MemoxFileProjectionService(
      prisma as unknown as PrismaService,
      memoxClient as unknown as MemoxClient,
      new MemoxSourceBridgeService(),
      storageClient as unknown as StorageClient,
      runtimeConfigService as unknown as MemoxRuntimeConfigService,
      legacyVectorSearchClient as unknown as LegacyVectorSearchClient,
    );

  const createService = () =>
    new MemoxOutboxConsumerService(
      outboxService as unknown as FileLifecycleOutboxLeaseService,
      createProjectionService(),
    );

  it('delegates file_upserted events to the file projection boundary before acking', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({ id: 'evt-delegate' }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    memoxClient.resolveSourceIdentity.mockResolvedValue(
      buildSourceIdentityResponse({
        current_revision_id: 'revision-1',
        metadata: {
          source_origin: 'moryflow_sync',
          content_hash: HELLO_WORLD_HASH,
          storage_revision: 'rev-1',
        },
      }),
    );
    const projectionService = createProjectionService();
    const upsertSpy = vi.spyOn(projectionService, 'upsertFile');
    const service = new MemoxOutboxConsumerService(
      outboxService as unknown as FileLifecycleOutboxLeaseService,
      projectionService,
    );

    await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(upsertSpy).toHaveBeenCalledWith({
      eventId: 'evt-delegate',
      userId: 'user-1',
      vaultId: 'vault-1',
      fileId: 'file-1',
      path: '/Doc.md',
      title: 'Doc',
      contentHash: HELLO_WORLD_HASH,
      storageRevision: 'rev-1',
      previousContentHash: OLD_CONTENT_HASH,
      previousStorageRevision: 'rev-old',
    });
    expect(outboxService.ackClaimedBatch).toHaveBeenCalledWith('consumer-a', [
      'evt-delegate',
    ]);
  });

  it('refreshes identity without touching legacy baseline on default memox backend', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({
        id: 'evt-rename',
        payload: {
          previousPath: '/Old.md',
          previousContentHash: HELLO_WORLD_HASH,
          previousStorageRevision: 'rev-1',
        },
      }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    memoxClient.resolveSourceIdentity.mockResolvedValue(
      buildSourceIdentityResponse({
        current_revision_id: 'revision-1',
        metadata: {
          source_origin: 'moryflow_sync',
          content_hash: HELLO_WORLD_HASH,
          storage_revision: 'rev-1',
        },
      }),
    );
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(memoxClient.resolveSourceIdentity).toHaveBeenCalledTimes(1);
    expect(memoxClient.createSourceRevision).not.toHaveBeenCalled();
    expect(memoxClient.finalizeSourceRevision).not.toHaveBeenCalled();
    expect(legacyVectorSearchClient.upsertFile).not.toHaveBeenCalled();
    expect(outboxService.ackClaimedBatch).toHaveBeenCalledWith('consumer-a', [
      'evt-rename',
    ]);
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
  });

  it('creates a revision for rename-only upserts when Memox has not indexed the file generation yet', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({
        id: 'evt-rename-bootstrap',
        payload: {
          previousPath: '/Old.md',
          previousContentHash: HELLO_WORLD_HASH,
          previousStorageRevision: 'rev-1',
        },
      }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    memoxClient.resolveSourceIdentity
      .mockResolvedValueOnce(
        buildSourceIdentityResponse({
          current_revision_id: null,
          metadata: null,
        }),
      )
      .mockResolvedValueOnce(buildSourceIdentityResponse());
    memoxClient.createSourceRevision.mockResolvedValue({
      id: 'revision-1',
      source_id: 'source-1',
    });
    memoxClient.finalizeSourceRevision.mockResolvedValue({
      revision_id: 'revision-1',
    });
    const service = createService();

    await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(memoxClient.createSourceRevision).toHaveBeenCalledWith({
      sourceId: 'source-1',
      idempotencyKey: 'evt-rename-bootstrap:revision-create',
      requestId: 'evt-rename-bootstrap',
      body: {
        mode: 'inline_text',
        content: 'Hello World',
        mime_type: 'text/markdown',
      },
    });
    expect(memoxClient.finalizeSourceRevision).toHaveBeenCalledWith({
      revisionId: 'revision-1',
      idempotencyKey: 'evt-rename-bootstrap:revision-finalize',
      requestId: 'evt-rename-bootstrap',
    });
    expect(memoxClient.resolveSourceIdentity).toHaveBeenCalledTimes(2);
    expect(legacyVectorSearchClient.upsertFile).not.toHaveBeenCalled();
  });

  it('bridges changed file_upserted events into Memox without legacy mirror on default memox backend', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({
        id: 'evt-changed',
        payload: {
          contentHash: UPDATED_CONTENT_HASH,
          storageRevision: 'rev-2',
          vectorClock: { device: 2 },
          previousContentHash: OLD_CONTENT_HASH,
          previousStorageRevision: 'rev-old',
        },
      }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    prisma.syncFile.findFirst.mockResolvedValue({
      isDeleted: false,
      path: '/Doc.md',
      title: 'Doc',
      contentHash: UPDATED_CONTENT_HASH,
      storageRevision: 'rev-2',
    });
    memoxClient.resolveSourceIdentity
      .mockResolvedValueOnce(
        buildSourceIdentityResponse({
          current_revision_id: 'revision-old',
          metadata: {
            source_origin: 'moryflow_sync',
            content_hash: OLD_CONTENT_HASH,
            storage_revision: 'rev-old',
          },
        }),
      )
      .mockResolvedValueOnce(buildSourceIdentityResponse());
    memoxClient.createSourceRevision.mockResolvedValue({
      id: 'revision-2',
      source_id: 'source-1',
    });
    memoxClient.finalizeSourceRevision.mockResolvedValue({
      revision_id: 'revision-2',
    });
    const service = createService();

    await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(memoxClient.resolveSourceIdentity).toHaveBeenNthCalledWith(1, {
      sourceType: 'note_markdown',
      externalId: 'file-1',
      idempotencyKey: 'evt-changed:source-identity',
      requestId: 'evt-changed',
      body: {
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'vault-1',
        display_path: '/Doc.md',
        mime_type: 'text/markdown',
        metadata: {
          source_origin: 'moryflow_sync',
        },
      },
    });
    expect(memoxClient.createSourceRevision).toHaveBeenCalledWith({
      sourceId: 'source-1',
      idempotencyKey: 'evt-changed:revision-create',
      requestId: 'evt-changed',
      body: {
        mode: 'inline_text',
        content: 'Updated content',
        mime_type: 'text/markdown',
      },
    });
    expect(memoxClient.finalizeSourceRevision).toHaveBeenCalledWith({
      revisionId: 'revision-2',
      idempotencyKey: 'evt-changed:revision-finalize',
      requestId: 'evt-changed',
    });
    expect(memoxClient.resolveSourceIdentity).toHaveBeenNthCalledWith(2, {
      sourceType: 'note_markdown',
      externalId: 'file-1',
      idempotencyKey: 'evt-changed:source-identity-materialize',
      requestId: 'evt-changed',
      body: {
        title: 'Doc',
        user_id: 'user-1',
        project_id: 'vault-1',
        display_path: '/Doc.md',
        mime_type: 'text/markdown',
        metadata: {
          source_origin: 'moryflow_sync',
          content_hash: UPDATED_CONTENT_HASH,
          storage_revision: 'rev-2',
        },
      },
    });
    expect(legacyVectorSearchClient.upsertFile).not.toHaveBeenCalled();
  });

  it('does not refresh legacy baseline when Memox already matches the current generation on default memox backend', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({
        id: 'evt-aligned',
        payload: {
          contentHash: UPDATED_CONTENT_HASH,
          storageRevision: 'rev-2',
          vectorClock: { device: 2 },
          previousContentHash: OLD_CONTENT_HASH,
          previousStorageRevision: 'rev-old',
        },
      }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    prisma.syncFile.findFirst.mockResolvedValue({
      isDeleted: false,
      path: '/Doc.md',
      title: 'Doc',
      contentHash: UPDATED_CONTENT_HASH,
      storageRevision: 'rev-2',
    });
    memoxClient.resolveSourceIdentity.mockResolvedValue(
      buildSourceIdentityResponse({
        current_revision_id: 'revision-2',
        metadata: {
          source_origin: 'moryflow_sync',
          content_hash: UPDATED_CONTENT_HASH,
          storage_revision: 'rev-2',
        },
      }),
    );
    const service = createService();

    await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(memoxClient.resolveSourceIdentity).toHaveBeenCalledTimes(1);
    expect(memoxClient.createSourceRevision).not.toHaveBeenCalled();
    expect(memoxClient.finalizeSourceRevision).not.toHaveBeenCalled();
    expect(legacyVectorSearchClient.upsertFile).not.toHaveBeenCalled();
  });

  it('treats delete on missing source identity as no-op on default memox backend', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildDeleteEvent({ id: 'evt-delete' }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    prisma.syncFile.findFirst.mockResolvedValue(null);
    memoxClient.resolveSourceIdentity.mockRejectedValue(
      new MemoxGatewayError(
        'title is required when creating source identity',
        400,
        'SOURCE_IDENTITY_TITLE_REQUIRED',
      ),
    );
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(memoxClient.deleteSource).not.toHaveBeenCalled();
    expect(legacyVectorSearchClient.deleteFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
  });

  it('mirrors legacy vector baseline when rollback backend is enabled', async () => {
    runtimeConfigService.isLegacyVectorBaselineEnabled.mockReturnValue(true);
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({
        id: 'evt-legacy-upsert',
        payload: {
          contentHash: UPDATED_CONTENT_HASH,
          storageRevision: 'rev-2',
          vectorClock: { device: 2 },
          previousContentHash: OLD_CONTENT_HASH,
          previousStorageRevision: 'rev-old',
        },
      }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    prisma.syncFile.findFirst.mockResolvedValue({
      isDeleted: false,
      path: '/Doc.md',
      title: 'Doc',
      contentHash: UPDATED_CONTENT_HASH,
      storageRevision: 'rev-2',
    });
    memoxClient.resolveSourceIdentity.mockResolvedValue(
      buildSourceIdentityResponse({
        current_revision_id: 'revision-2',
        metadata: {
          source_origin: 'moryflow_sync',
          content_hash: UPDATED_CONTENT_HASH,
          storage_revision: 'rev-2',
        },
      }),
    );
    const service = createService();

    await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(legacyVectorSearchClient.upsertFile).toHaveBeenCalledWith({
      userId: 'user-1',
      fileId: 'file-1',
      content: 'Updated content',
      vaultId: 'vault-1',
      title: 'Doc',
      path: '/Doc.md',
    });
  });

  it('deletes legacy vector baseline only when rollback backend is enabled', async () => {
    runtimeConfigService.isLegacyVectorBaselineEnabled.mockReturnValue(true);
    outboxService.claimPendingBatch.mockResolvedValue([
      buildDeleteEvent({ id: 'evt-legacy-delete' }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    prisma.syncFile.findFirst.mockResolvedValue(null);
    memoxClient.resolveSourceIdentity.mockRejectedValue(
      new MemoxGatewayError(
        'title is required when creating source identity',
        400,
        'SOURCE_IDENTITY_TITLE_REQUIRED',
      ),
    );
    const service = createService();

    await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(legacyVectorSearchClient.deleteFile).toHaveBeenCalledWith({
      userId: 'user-1',
      fileId: 'file-1',
    });
  });

  it('repeats frozen scope fields when resolving source identity for delete', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildDeleteEvent({ id: 'evt-delete-scope' }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    prisma.syncFile.findFirst.mockResolvedValue(null);
    memoxClient.resolveSourceIdentity.mockResolvedValue(
      buildSourceIdentityResponse(),
    );
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(memoxClient.resolveSourceIdentity).toHaveBeenCalledWith({
      sourceType: 'note_markdown',
      externalId: 'file-1',
      body: {
        user_id: 'user-1',
        project_id: 'vault-1',
      },
      idempotencyKey: 'evt-delete-scope:source-identity',
      requestId: 'evt-delete-scope',
    });
    expect(memoxClient.deleteSource).toHaveBeenCalledWith({
      sourceId: 'source-1',
      idempotencyKey: 'evt-delete-scope:source-delete',
      requestId: 'evt-delete-scope',
    });
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
  });

  it('skips stale upsert events that no longer match sync truth', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({
        id: 'evt-stale-upsert',
        payload: {
          path: '/Old.md',
          title: 'Old',
          contentHash: OLD_CONTENT_HASH,
          storageRevision: 'rev-old',
          previousPath: null,
          previousContentHash: null,
          previousStorageRevision: null,
        },
      }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    prisma.syncFile.findFirst.mockResolvedValue({
      isDeleted: false,
      path: '/Doc.md',
      title: 'Doc',
      contentHash: UPDATED_CONTENT_HASH,
      storageRevision: 'rev-2',
    });
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(memoxClient.resolveSourceIdentity).not.toHaveBeenCalled();
    expect(legacyVectorSearchClient.upsertFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
  });

  it('records retryable failures into outbox retry state instead of acking', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({ id: 'evt-retryable', attemptCount: 2 }),
    ]);
    storageClient.downloadSyncStream.mockRejectedValue(new Error('timeout'));
    memoxClient.resolveSourceIdentity.mockResolvedValue(
      buildSourceIdentityResponse({
        current_revision_id: null,
        metadata: null,
      }),
    );
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(outboxService.failClaimedEvent).toHaveBeenCalledWith({
      consumerId: 'consumer-a',
      id: 'evt-retryable',
      attemptCount: 2,
      errorCode: 'OUTBOX_EVENT_FAILED',
      errorMessage: 'timeout',
      retryable: true,
    });
    expect(outboxService.ackClaimedBatch).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 0,
      failedIds: ['evt-retryable'],
      deadLetteredIds: [],
    });
  });

  it('dead-letters deterministic Memox 4xx failures instead of retrying forever', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({ id: 'evt-unauthorized' }),
    ]);
    outboxService.failClaimedEvent.mockResolvedValue({
      state: 'dead_lettered',
      retryAt: null,
    });
    memoxClient.resolveSourceIdentity.mockRejectedValue(
      new MemoxGatewayError('Unauthorized', 401, 'MEMOX_UNAUTHORIZED'),
    );
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(outboxService.failClaimedEvent).toHaveBeenCalledWith({
      consumerId: 'consumer-a',
      id: 'evt-unauthorized',
      attemptCount: 1,
      errorCode: 'MEMOX_UNAUTHORIZED',
      errorMessage: 'Unauthorized',
      retryable: false,
    });
    expect(result.deadLetteredIds).toEqual(['evt-unauthorized']);
  });

  it('dead-letters poison payloads instead of retrying forever', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      {
        ...buildUpsertEvent({ id: 'evt-poison' }),
        payload: {
          title: 'Doc',
          size: 100,
          contentHash: HELLO_WORLD_HASH,
          storageRevision: 'rev-1',
          vectorClock: { device: 1 },
        },
      },
    ]);
    outboxService.failClaimedEvent.mockResolvedValue({
      state: 'dead_lettered',
      retryAt: null,
    });
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(outboxService.failClaimedEvent).toHaveBeenCalledWith({
      consumerId: 'consumer-a',
      id: 'evt-poison',
      attemptCount: 1,
      errorCode: 'OUTBOX_PAYLOAD_INVALID',
      errorMessage: 'Invalid outbox payload: file_upserted.path',
      retryable: false,
    });
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 0,
      failedIds: ['evt-poison'],
      deadLetteredIds: ['evt-poison'],
    });
  });

  it('skips stale delete events when the file is still active in sync truth', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildDeleteEvent({ id: 'evt-stale-delete' }),
    ]);
    outboxService.ackClaimedBatch.mockResolvedValue(1);
    prisma.syncFile.findFirst.mockResolvedValue({
      isDeleted: false,
      path: '/Doc.md',
      title: 'Doc',
      contentHash: UPDATED_CONTENT_HASH,
      storageRevision: 'rev-2',
    });
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(memoxClient.resolveSourceIdentity).not.toHaveBeenCalled();
    expect(legacyVectorSearchClient.deleteFile).not.toHaveBeenCalled();
    expect(result).toEqual({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
  });

  it('dead-letters retryable events after the final attempt', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({ id: 'evt-final', attemptCount: 5 }),
    ]);
    outboxService.failClaimedEvent.mockResolvedValue({
      state: 'dead_lettered',
      retryAt: null,
    });
    storageClient.downloadSyncStream.mockRejectedValue(
      new Error('storage unavailable'),
    );
    memoxClient.resolveSourceIdentity.mockResolvedValue(
      buildSourceIdentityResponse({
        current_revision_id: null,
        metadata: null,
      }),
    );
    const service = createService();

    const result = await service.processBatch({
      consumerId: 'consumer-a',
      limit: 10,
      leaseMs: 30_000,
    });

    expect(outboxService.failClaimedEvent).toHaveBeenCalledWith({
      consumerId: 'consumer-a',
      id: 'evt-final',
      attemptCount: 5,
      errorCode: 'OUTBOX_EVENT_FAILED',
      errorMessage: 'storage unavailable',
      retryable: true,
    });
    expect(result.deadLetteredIds).toEqual(['evt-final']);
  });

  it('fails the batch when failure state cannot be persisted', async () => {
    outboxService.claimPendingBatch.mockResolvedValue([
      buildUpsertEvent({ id: 'evt-fail-persist' }),
    ]);
    outboxService.failClaimedEvent.mockRejectedValue(
      new Error('outbox write failed'),
    );
    storageClient.downloadSyncStream.mockRejectedValue(new Error('timeout'));
    memoxClient.resolveSourceIdentity.mockResolvedValue(
      buildSourceIdentityResponse({
        current_revision_id: null,
        metadata: null,
      }),
    );
    const service = createService();

    await expect(
      service.processBatch({
        consumerId: 'consumer-a',
        limit: 10,
        leaseMs: 30_000,
      }),
    ).rejects.toThrow('outbox write failed');

    expect(outboxService.ackClaimedBatch).not.toHaveBeenCalled();
  });
});

function buildUpsertEvent(params?: {
  id?: string;
  attemptCount?: number;
  payload?: Partial<Record<string, unknown>>;
}) {
  return {
    id: params?.id ?? 'evt-upsert',
    userId: 'user-1',
    vaultId: 'vault-1',
    fileId: 'file-1',
    eventType: 'file_upserted',
    payload: {
      path: '/Doc.md',
      title: 'Doc',
      size: 100,
      contentHash: HELLO_WORLD_HASH,
      storageRevision: 'rev-1',
      vectorClock: { device: 1 },
      previousPath: null,
      previousContentHash: OLD_CONTENT_HASH,
      previousStorageRevision: 'rev-old',
      ...params?.payload,
    },
    createdAt: new Date('2026-03-07T00:00:00.000Z'),
    processedAt: null,
    attemptCount: params?.attemptCount ?? 1,
    leasedBy: 'consumer-a',
    leaseExpiresAt: new Date('2026-03-07T00:00:30.000Z'),
  };
}

function buildDeleteEvent(params?: { id?: string; attemptCount?: number }) {
  return {
    id: params?.id ?? 'evt-delete',
    userId: 'user-1',
    vaultId: 'vault-1',
    fileId: 'file-1',
    eventType: 'file_deleted',
    payload: {
      path: '/Doc.md',
      contentHash: HELLO_WORLD_HASH,
      storageRevision: 'rev-1',
    },
    createdAt: new Date('2026-03-07T00:00:00.000Z'),
    processedAt: null,
    attemptCount: params?.attemptCount ?? 1,
    leasedBy: 'consumer-a',
    leaseExpiresAt: new Date('2026-03-07T00:00:30.000Z'),
  };
}

function buildSourceIdentityResponse(
  overrides?: Partial<Record<string, unknown>>,
) {
  return {
    source_id: 'source-1',
    source_type: 'note_markdown',
    external_id: 'file-1',
    user_id: 'user-1',
    agent_id: null,
    app_id: null,
    run_id: null,
    org_id: null,
    project_id: 'vault-1',
    title: 'Doc',
    display_path: '/Doc.md',
    mime_type: 'text/markdown',
    metadata: null,
    current_revision_id: 'revision-1',
    status: 'ACTIVE',
    created_at: '2026-03-07T00:00:00.000Z',
    updated_at: '2026-03-07T00:00:00.000Z',
    ...overrides,
  };
}

function resolveSnapshot(storageRevision: string): {
  content: string;
  hash: string;
} {
  switch (storageRevision) {
    case 'rev-old':
      return { content: 'Old content', hash: OLD_CONTENT_HASH };
    case 'rev-2':
      return { content: 'Updated content', hash: UPDATED_CONTENT_HASH };
    case 'rev-1':
    default:
      return { content: 'Hello World', hash: HELLO_WORLD_HASH };
  }
}
