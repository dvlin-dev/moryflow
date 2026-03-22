import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';
import { MemoxGatewayError } from './memox.client';
import { MemoxWorkspaceContentProjectionService } from './memox-workspace-content-projection.service';

describe('MemoxWorkspaceContentProjectionService', () => {
  let prismaMock: MockPrismaService;
  let memoxClient: {
    getSourceIdentity: ReturnType<typeof vi.fn>;
    resolveSourceIdentity: ReturnType<typeof vi.fn>;
    createSourceRevision: ReturnType<typeof vi.fn>;
    finalizeSourceRevision: ReturnType<typeof vi.fn>;
    deleteSource: ReturnType<typeof vi.fn>;
  };
  let bridgeService: {
    buildLifecycleIdempotencyFamily: ReturnType<typeof vi.fn>;
    buildSourceIdentityInput: ReturnType<typeof vi.fn>;
    buildSourceIdentityLookupQuery: ReturnType<typeof vi.fn>;
    buildInlineRevisionBody: ReturnType<typeof vi.fn>;
  };
  let storageClient: {
    downloadSyncStream: ReturnType<typeof vi.fn>;
  };
  let telemetryService: {
    recordUpsertRequest: ReturnType<typeof vi.fn>;
    recordDeleteRequest: ReturnType<typeof vi.fn>;
    recordIdentityResolve: ReturnType<typeof vi.fn>;
    recordIdentityLookup: ReturnType<typeof vi.fn>;
    recordIdentityLookupMiss: ReturnType<typeof vi.fn>;
    recordRevisionCreate: ReturnType<typeof vi.fn>;
    recordRevisionFinalize: ReturnType<typeof vi.fn>;
    recordUnchangedSkip: ReturnType<typeof vi.fn>;
    recordSourceDelete: ReturnType<typeof vi.fn>;
  };
  let service: MemoxWorkspaceContentProjectionService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'document-1',
      workspaceId: 'workspace-1',
      currentRevisionId: 'revision-1',
    });

    memoxClient = {
      getSourceIdentity: vi.fn(),
      resolveSourceIdentity: vi.fn(),
      createSourceRevision: vi.fn(),
      finalizeSourceRevision: vi.fn(),
      deleteSource: vi.fn(),
    };
    bridgeService = {
      buildLifecycleIdempotencyFamily: vi.fn((rootKey: string) => ({
        sourceIdentity: `${rootKey}:source-identity`,
        revisionCreate: `${rootKey}:revision-create`,
        revisionFinalize: `${rootKey}:revision-finalize`,
        sourceDelete: `${rootKey}:source-delete`,
      })),
      buildSourceIdentityInput: vi.fn(() => ({
        sourceType: 'moryflow_workspace_markdown_v1',
        externalId: 'document-1',
        body: {
          title: 'Doc',
          user_id: 'user-1',
          project_id: 'workspace-1',
          display_path: 'notes/doc.md',
          mime_type: 'text/markdown',
          metadata: {
            source_origin: 'moryflow_workspace_content',
          },
        },
      })),
      buildSourceIdentityLookupQuery: vi.fn(() => ({
        sourceType: 'moryflow_workspace_markdown_v1',
        externalId: 'document-1',
        query: {
          user_id: 'user-1',
          project_id: 'workspace-1',
        },
      })),
      buildInlineRevisionBody: vi.fn(() => ({
        mode: 'inline_text',
        content: '# Updated\n\nBody',
        mime_type: 'text/markdown',
      })),
    };
    storageClient = {
      downloadSyncStream: vi.fn(),
    };
    telemetryService = {
      recordUpsertRequest: vi.fn(),
      recordDeleteRequest: vi.fn(),
      recordIdentityResolve: vi.fn(),
      recordIdentityLookup: vi.fn(),
      recordIdentityLookupMiss: vi.fn(),
      recordRevisionCreate: vi.fn(),
      recordRevisionFinalize: vi.fn(),
      recordUnchangedSkip: vi.fn(),
      recordSourceDelete: vi.fn(),
    };
    service = new MemoxWorkspaceContentProjectionService(
      prismaMock as never,
      memoxClient as never,
      bridgeService as never,
      storageClient as never,
      telemetryService as never,
    );
  });

  it('deletes the existing source when a current revision becomes non-indexable', async () => {
    memoxClient.getSourceIdentity.mockResolvedValue({
      source_id: 'source-1',
      current_revision_id: 'revision-current',
    });

    const result = await service.upsertDocument({
      eventId: 'evt-1',
      revisionId: 'revision-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'document-1',
      title: 'Doc',
      path: 'notes/doc.md',
      mimeType: 'text/markdown',
      contentHash: 'hash-new',
      mode: 'inline_text',
      content: '   \n\t',
    });

    expect(result).toEqual({ disposition: 'QUIET_SKIPPED' });
    expect(memoxClient.getSourceIdentity).toHaveBeenCalledWith({
      sourceType: 'moryflow_workspace_markdown_v1',
      externalId: 'document-1',
      query: {
        user_id: 'user-1',
        project_id: 'workspace-1',
      },
      requestId: 'evt-1',
    });
    expect(memoxClient.deleteSource).toHaveBeenCalledWith({
      sourceId: 'source-1',
      idempotencyKey: 'workspace-content-revision:revision-1:source-delete',
      requestId: 'evt-1',
    });
    expect(memoxClient.resolveSourceIdentity).not.toHaveBeenCalled();
    expect(memoxClient.createSourceRevision).not.toHaveBeenCalled();
    expect(memoxClient.finalizeSourceRevision).not.toHaveBeenCalled();
  });

  it('deletes the existing source when a current revision is heading-only markdown', async () => {
    memoxClient.getSourceIdentity.mockResolvedValue({
      source_id: 'source-1',
      current_revision_id: 'revision-current',
    });

    const result = await service.upsertDocument({
      eventId: 'evt-1',
      revisionId: 'revision-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'document-1',
      title: 'Doc',
      path: 'notes/doc.md',
      mimeType: 'text/markdown',
      contentHash: 'hash-new',
      mode: 'inline_text',
      content: '# New note',
    });

    expect(result).toEqual({ disposition: 'QUIET_SKIPPED' });
    expect(memoxClient.getSourceIdentity).toHaveBeenCalledWith({
      sourceType: 'moryflow_workspace_markdown_v1',
      externalId: 'document-1',
      query: {
        user_id: 'user-1',
        project_id: 'workspace-1',
      },
      requestId: 'evt-1',
    });
    expect(memoxClient.deleteSource).toHaveBeenCalledWith({
      sourceId: 'source-1',
      idempotencyKey: 'workspace-content-revision:revision-1:source-delete',
      requestId: 'evt-1',
    });
    expect(memoxClient.resolveSourceIdentity).not.toHaveBeenCalled();
    expect(memoxClient.createSourceRevision).not.toHaveBeenCalled();
    expect(memoxClient.finalizeSourceRevision).not.toHaveBeenCalled();
  });

  it('looks up source identity via GET before deleting a document', async () => {
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'document-1',
      workspaceId: 'workspace-1',
      currentRevisionId: null,
    });
    memoxClient.getSourceIdentity.mockResolvedValue({
      source_id: 'source-1',
      current_revision_id: 'revision-1',
    });

    const result = await service.deleteDocument({
      eventId: 'evt-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'document-1',
    });

    expect(result).toEqual({ disposition: 'DELETED' });
    expect(memoxClient.deleteSource).toHaveBeenCalledWith({
      sourceId: 'source-1',
      idempotencyKey:
        'workspace-content-delete:workspace-1:document-1:source-delete',
      requestId: 'evt-1',
    });
    expect(memoxClient.resolveSourceIdentity).not.toHaveBeenCalled();
    expect(telemetryService.recordDeleteRequest).toHaveBeenCalled();
    expect(telemetryService.recordIdentityLookup).toHaveBeenCalled();
    expect(telemetryService.recordSourceDelete).toHaveBeenCalled();
  });

  it('creates and finalizes a revision once for the active canonical revision', async () => {
    memoxClient.resolveSourceIdentity.mockResolvedValue({
      source_id: 'source-1',
      current_revision_id: 'revision-current',
    });
    memoxClient.createSourceRevision.mockResolvedValue({
      id: 'revision-next',
    });
    memoxClient.finalizeSourceRevision.mockResolvedValue(undefined);

    const result = await service.upsertDocument({
      eventId: 'evt-1',
      revisionId: 'revision-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'document-1',
      title: 'Doc',
      path: 'notes/doc.md',
      mimeType: 'text/markdown',
      contentHash: 'hash-new',
      mode: 'inline_text',
      content: '# Updated\n\nBody',
    });

    expect(result).toEqual({ disposition: 'INDEXED' });
    expect(bridgeService.buildSourceIdentityInput).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'document-1',
      title: 'Doc',
      displayPath: 'notes/doc.md',
      mimeType: 'text/markdown',
    });
    expect(memoxClient.resolveSourceIdentity).toHaveBeenCalledTimes(1);
    expect(memoxClient.createSourceRevision).toHaveBeenCalledTimes(1);
    expect(memoxClient.finalizeSourceRevision).toHaveBeenCalledWith({
      revisionId: 'revision-next',
      idempotencyKey: 'workspace-content-revision:revision-1:revision-finalize',
      requestId: 'evt-1',
    });
  });

  it('treats stale outbox revisions as no-op instead of replaying outdated content', async () => {
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'document-1',
      workspaceId: 'workspace-1',
      currentRevisionId: 'revision-current',
    });

    const result = await service.upsertDocument({
      eventId: 'evt-1',
      revisionId: 'revision-stale',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'document-1',
      title: 'Doc',
      path: 'notes/doc.md',
      mimeType: 'text/markdown',
      contentHash: 'hash-stale',
      mode: 'inline_text',
      content: '# Stale',
    });

    expect(result).toEqual({ disposition: null });
    expect(memoxClient.resolveSourceIdentity).not.toHaveBeenCalled();
    expect(memoxClient.createSourceRevision).not.toHaveBeenCalled();
    expect(memoxClient.finalizeSourceRevision).not.toHaveBeenCalled();
    expect(memoxClient.getSourceIdentity).not.toHaveBeenCalled();
  });

  it('treats missing source identity lookup as delete no-op', async () => {
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'document-1',
      workspaceId: 'workspace-1',
      currentRevisionId: null,
    });
    memoxClient.getSourceIdentity.mockRejectedValueOnce(
      new MemoxGatewayError('Not Found', 404, 'SOURCE_IDENTITY_NOT_FOUND'),
    );

    await expect(
      service.deleteDocument({
        eventId: 'evt-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
        documentId: 'document-1',
      }),
    ).resolves.toEqual({ disposition: 'DELETED' });

    expect(memoxClient.deleteSource).not.toHaveBeenCalled();
    expect(telemetryService.recordIdentityLookupMiss).toHaveBeenCalled();
  });
});
