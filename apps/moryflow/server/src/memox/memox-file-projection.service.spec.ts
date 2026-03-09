import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoxFileProjectionService } from './memox-file-projection.service';
import type { PrismaService } from '../prisma';
import type { MemoxClient } from './memox.client';
import { MemoxGatewayError } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import type { StorageClient } from '../storage';

const HELLO_WORLD_HASH =
  'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
const UPDATED_CONTENT_HASH =
  '9a29ebdf54e75363184478c0e7ec809b2aaa764fa080b3cf8fd6c11f7bd83a49';
const OLD_CONTENT_HASH =
  'efe5df377a4fffff54a5362fa31652faae12ff0a6e2f8b9d4af4b5869a989b04';

describe('MemoxFileProjectionService', () => {
  let memoxClient: {
    resolveSourceIdentity: ReturnType<typeof vi.fn>;
    createSourceRevision: ReturnType<typeof vi.fn>;
    finalizeSourceRevision: ReturnType<typeof vi.fn>;
    deleteSource: ReturnType<typeof vi.fn>;
  };
  let storageClient: {
    downloadSyncStream: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    syncFile: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    memoxClient = {
      resolveSourceIdentity: vi.fn(),
      createSourceRevision: vi.fn(),
      finalizeSourceRevision: vi.fn(),
      deleteSource: vi.fn(),
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

  const createService = () =>
    new MemoxFileProjectionService(
      prisma as unknown as PrismaService,
      memoxClient as unknown as MemoxClient,
      new MemoxSourceBridgeService(),
      storageClient as unknown as StorageClient,
    );

  it('skips snapshot download and revision rebuild when the current generation already matches', async () => {
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

    await service.upsertFile({
      eventId: 'evt-aligned',
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

    expect(storageClient.downloadSyncStream).not.toHaveBeenCalled();
    expect(memoxClient.createSourceRevision).not.toHaveBeenCalled();
    expect(memoxClient.finalizeSourceRevision).not.toHaveBeenCalled();
  });

  it('creates and materializes a revision for changed files', async () => {
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

    await service.upsertFile({
      eventId: 'evt-changed',
      userId: 'user-1',
      vaultId: 'vault-1',
      fileId: 'file-1',
      path: '/Doc.md',
      title: 'Doc',
      contentHash: UPDATED_CONTENT_HASH,
      storageRevision: 'rev-2',
      previousContentHash: OLD_CONTENT_HASH,
      previousStorageRevision: 'rev-old',
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
  });

  it('treats delete on missing source identity as no-op', async () => {
    prisma.syncFile.findFirst.mockResolvedValue({
      isDeleted: true,
      path: '/Doc.md',
      title: 'Doc',
      contentHash: HELLO_WORLD_HASH,
      storageRevision: 'rev-1',
    });
    memoxClient.resolveSourceIdentity.mockRejectedValue(
      new MemoxGatewayError('Source missing', 404, 'SOURCE_NOT_FOUND'),
    );
    const service = createService();

    await expect(
      service.deleteFile({
        eventId: 'evt-delete',
        userId: 'user-1',
        vaultId: 'vault-1',
        fileId: 'file-1',
      }),
    ).resolves.toBeUndefined();

    expect(memoxClient.deleteSource).not.toHaveBeenCalled();
  });

  it('treats delete on deleted source identity as idempotent no-op', async () => {
    prisma.syncFile.findFirst.mockResolvedValue({
      isDeleted: true,
      path: '/Doc.md',
      title: 'Doc',
      contentHash: HELLO_WORLD_HASH,
      storageRevision: 'rev-1',
    });
    memoxClient.resolveSourceIdentity.mockRejectedValue(
      new MemoxGatewayError('Source deleted', 409, 'SOURCE_IDENTITY_DELETED'),
    );
    const service = createService();

    await expect(
      service.deleteFile({
        eventId: 'evt-delete',
        userId: 'user-1',
        vaultId: 'vault-1',
        fileId: 'file-1',
      }),
    ).resolves.toBeUndefined();

    expect(memoxClient.deleteSource).not.toHaveBeenCalled();
  });
});

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
