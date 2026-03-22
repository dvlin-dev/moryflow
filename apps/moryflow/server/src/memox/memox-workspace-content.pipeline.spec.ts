import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceContentOutboxEventType } from '../../generated/prisma/enums';
import { WorkspaceContentService } from '../workspace-content/workspace-content.service';
import { MemoxGatewayError } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import { MemoxWorkspaceContentConsumerService } from './memox-workspace-content-consumer.service';
import { MemoxWorkspaceContentProjectionService } from './memox-workspace-content-projection.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('WorkspaceContent -> Memox pipeline', () => {
  let prismaMock: MockPrismaService;
  let memoxClient: {
    getSourceIdentity: ReturnType<typeof vi.fn>;
    resolveSourceIdentity: ReturnType<typeof vi.fn>;
    createSourceRevision: ReturnType<typeof vi.fn>;
    finalizeSourceRevision: ReturnType<typeof vi.fn>;
    deleteSource: ReturnType<typeof vi.fn>;
  };
  let storageClient: {
    downloadSyncStream: ReturnType<typeof vi.fn>;
  };
  let telemetryService: {
    recordBatch: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
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
  let workspaceContentService: WorkspaceContentService;
  let consumerService: MemoxWorkspaceContentConsumerService;
  let outboxEvent: {
    id: string;
    revisionId: string | null;
    eventType: WorkspaceContentOutboxEventType;
    payload: Record<string, unknown>;
    attemptCount: number;
    processedAt: Date | null;
    deadLetteredAt: Date | null;
    leasedBy: string | null;
    leaseExpiresAt: Date | null;
    createdAt: Date;
  } | null;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) =>
        callback(prismaMock),
    );
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: null,
    });
    prismaMock.workspaceDocumentRevision.findUnique.mockResolvedValue(null);
    prismaMock.workspaceDocumentRevision.create.mockResolvedValue({
      id: 'rev-1',
    });
    prismaMock.workspaceDocument.update.mockResolvedValue({
      id: 'doc-1',
      currentRevisionId: 'rev-1',
    });
    prismaMock.workspaceContentOutbox.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValue({ count: 1 });
    outboxEvent = null;
    prismaMock.workspaceContentOutbox.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => {
        outboxEvent = {
          id: 'event-1',
          revisionId: (data.revisionId as string | null) ?? null,
          eventType: data.eventType as WorkspaceContentOutboxEventType,
          payload: data.payload as Record<string, unknown>,
          attemptCount: 0,
          processedAt: null,
          deadLetteredAt: null,
          leasedBy: null,
          leaseExpiresAt: null,
          createdAt: new Date('2026-03-21T09:00:00.000Z'),
        };

        return data;
      },
    );

    memoxClient = {
      getSourceIdentity: vi.fn(),
      resolveSourceIdentity: vi.fn(),
      createSourceRevision: vi.fn(),
      finalizeSourceRevision: vi.fn(),
      deleteSource: vi.fn(),
    };
    storageClient = {
      downloadSyncStream: vi.fn(),
    };
    telemetryService = {
      recordBatch: vi.fn(),
      recordFailure: vi.fn(),
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

    workspaceContentService = new WorkspaceContentService(prismaMock as never);
    consumerService = new MemoxWorkspaceContentConsumerService(
      prismaMock as never,
      new MemoxWorkspaceContentProjectionService(
        prismaMock as never,
        memoxClient as never,
        new MemoxSourceBridgeService(),
        storageClient as never,
        telemetryService as never,
      ),
      telemetryService as never,
    );
  });

  it('derives title on the server and pushes a stable source identity through the consumer pipeline', async () => {
    prismaMock.workspaceDocument.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        id: 'doc-1',
        workspaceId: 'workspace-1',
        currentRevisionId: 'rev-1',
        syncFile: null,
      });
    prismaMock.workspaceDocument.upsert.mockResolvedValue({
      id: 'doc-1',
      workspaceId: 'workspace-1',
      path: 'notes/   .md',
      title: '.md',
      mimeType: 'text/markdown',
      currentRevisionId: null,
    });
    memoxClient.resolveSourceIdentity.mockResolvedValue({
      source_id: 'source-1',
      metadata: null,
      current_revision_id: null,
    });
    memoxClient.createSourceRevision.mockResolvedValue({
      id: 'revision-1',
    });
    memoxClient.finalizeSourceRevision.mockResolvedValue(undefined);

    await workspaceContentService.batchUpsert('user-1', {
      workspaceId: 'workspace-1',
      documents: [
        {
          documentId: 'doc-1',
          path: 'notes/   .md',
          mimeType: 'text/markdown',
          contentHash: 'hash-1',
          mode: 'inline_text',
          contentText: '# Hello',
        },
      ],
    });
    expect(outboxEvent).not.toBeNull();
    const claimedEvent = outboxEvent!;

    prismaMock.workspaceContentOutbox.findMany
      .mockResolvedValueOnce([claimedEvent])
      .mockResolvedValueOnce([
        {
          ...claimedEvent,
          leasedBy: 'memox-workspace-content-consumer:lease-1',
        },
      ]);

    await consumerService.processBatch({
      consumerId: 'memox-workspace-content-consumer',
      limit: 10,
      leaseMs: 60_000,
    });

    expect(memoxClient.resolveSourceIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          title: '.md',
          display_path: 'notes/   .md',
          project_id: 'workspace-1',
        }),
      }),
    );
    expect(memoxClient.createSourceRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          mode: 'inline_text',
          content: '# Hello',
          mime_type: 'text/markdown',
        },
      }),
    );
  });

  it('treats delete lookup miss as acknowledged no-op when replaying outbox events', async () => {
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      workspaceId: 'workspace-1',
      currentRevisionId: null,
      syncFile: null,
    });
    prismaMock.workspaceDocument.delete.mockResolvedValue({
      id: 'doc-1',
    });
    memoxClient.getSourceIdentity.mockRejectedValue(
      new MemoxGatewayError('Not Found', 404, 'SOURCE_IDENTITY_NOT_FOUND'),
    );

    await workspaceContentService.batchDelete('user-1', {
      workspaceId: 'workspace-1',
      documents: [{ documentId: 'doc-1' }],
    });
    expect(outboxEvent).not.toBeNull();
    const claimedEvent = outboxEvent!;

    prismaMock.workspaceContentOutbox.findMany
      .mockResolvedValueOnce([claimedEvent])
      .mockResolvedValueOnce([
        {
          ...claimedEvent,
          leasedBy: 'memox-workspace-content-consumer:lease-1',
        },
      ]);

    const result = await consumerService.processBatch({
      consumerId: 'memox-workspace-content-consumer',
      limit: 10,
      leaseMs: 60_000,
    });

    expect(result).toEqual({
      claimed: 1,
      acknowledged: 1,
      failedIds: [],
      deadLetteredIds: [],
    });
    expect(memoxClient.deleteSource).not.toHaveBeenCalled();
  });
});
