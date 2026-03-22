import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceContentOutboxEventType } from '../../generated/prisma/enums';
import { MemoxWorkspaceContentControlService } from './memox-workspace-content-control.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('MemoxWorkspaceContentControlService', () => {
  let prismaMock: MockPrismaService;
  let consumerService: {
    processBatch: ReturnType<typeof vi.fn>;
  };
  let service: MemoxWorkspaceContentControlService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    consumerService = {
      processBatch: vi.fn(),
    };
    service = new MemoxWorkspaceContentControlService(
      prismaMock as never,
      consumerService as never,
    );
  });

  it('replays a single HTTP-safe batch and reports backlog state', async () => {
    consumerService.processBatch.mockResolvedValueOnce({
      claimed: 2,
      acknowledged: 2,
      failedIds: [],
      deadLetteredIds: [],
    });
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const result = await service.replayOutbox({
      batchSize: 2,
      maxBatches: 5,
      leaseMs: 30_000,
      consumerId: 'manual-replay',
    });

    expect(consumerService.processBatch).toHaveBeenNthCalledWith(1, {
      consumerId: 'manual-replay',
      limit: 2,
      leaseMs: 30_000,
    });
    expect(result).toEqual({
      claimed: 2,
      acknowledged: 2,
      failedIds: [],
      deadLetteredIds: [],
      drained: false,
      pendingCount: 1,
      deadLetteredCount: 0,
    });
  });

  it('clamps HTTP replay work to a single safe batch even when oversized options are provided', async () => {
    consumerService.processBatch.mockResolvedValue({
      claimed: 10,
      acknowledged: 10,
      failedIds: [],
      deadLetteredIds: [],
    });
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(0);

    await service.replayOutbox({
      batchSize: 200,
      maxBatches: 10,
      leaseMs: 30_000,
      consumerId: 'manual-replay',
    });

    expect(consumerService.processBatch).toHaveBeenCalledTimes(1);
    expect(consumerService.processBatch).toHaveBeenCalledWith({
      consumerId: 'manual-replay',
      limit: 10,
      leaseMs: 30_000,
    });
  });

  it('redrives dead-lettered outbox events by resetting lease and error state', async () => {
    prismaMock.workspaceContentOutbox.findMany.mockResolvedValue([
      { id: 'evt-1' },
      { id: 'evt-2' },
    ]);
    prismaMock.workspaceContentOutbox.updateMany.mockResolvedValue({
      count: 2,
    });

    const result = await service.redriveDeadLetters(10);

    expect(result).toBe(2);
    expect(prismaMock.workspaceContentOutbox.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['evt-1', 'evt-2'],
        },
        deadLetteredAt: {
          not: null,
        },
      },
      data: {
        attemptCount: 0,
        processedAt: null,
        resultDisposition: null,
        deadLetteredAt: null,
        leasedBy: null,
        leaseExpiresAt: null,
        lastAttemptAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
  });

  it('rebuilds canonical current revision state and skips documents that already have pending upsert events', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          workspaceId: 'workspace-1',
          path: 'notes/a.md',
          title: 'A',
          mimeType: 'text/markdown',
          currentRevisionId: 'rev-1',
          workspace: { userId: 'user-1' },
          syncFile: null,
          currentRevision: {
            id: 'rev-1',
            mode: 'INLINE_TEXT',
            contentHash: 'hash-1',
            contentText: '# A',
            syncObjectKey: null,
            storageRevision: null,
          },
        },
        {
          id: 'doc-2',
          workspaceId: 'workspace-1',
          path: 'notes/b.md',
          title: 'B',
          mimeType: 'text/markdown',
          currentRevisionId: 'rev-2',
          workspace: { userId: 'user-1' },
          syncFile: null,
          currentRevision: {
            id: 'rev-2',
            mode: 'INLINE_TEXT',
            contentHash: 'hash-2',
            contentText: '# B',
            syncObjectKey: null,
            storageRevision: null,
          },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    prismaMock.workspaceContentOutbox.create.mockResolvedValue({
      id: 'outbox-1',
    });

    const result = await service.rebuildActiveDocuments({
      workspaceId: 'workspace-1',
      limit: 10,
    });

    expect(result).toBe(1);
    expect(prismaMock.workspaceContentOutbox.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.workspaceContentOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'workspace-1',
        documentId: 'doc-1',
        revisionId: 'rev-1',
        eventType: WorkspaceContentOutboxEventType.UPSERT,
        payload: expect.objectContaining({
          workspaceId: 'workspace-1',
          documentId: 'doc-1',
          title: 'A',
          mode: 'inline_text',
          content: '# A',
          contentHash: 'hash-1',
        }),
      }),
    });
  });

  it('rebuilds all active documents by paging through the canonical document set', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          workspaceId: 'workspace-1',
          path: 'notes/a.md',
          title: 'A',
          mimeType: 'text/markdown',
          currentRevisionId: 'rev-1',
          workspace: { userId: 'user-1' },
          syncFile: null,
          currentRevision: {
            id: 'rev-1',
            mode: 'INLINE_TEXT',
            contentHash: 'hash-1',
            contentText: '# A',
            syncObjectKey: null,
            storageRevision: null,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'doc-2',
          workspaceId: 'workspace-1',
          path: 'notes/b.md',
          title: 'B',
          mimeType: 'text/markdown',
          currentRevisionId: 'rev-2',
          workspace: { userId: 'user-1' },
          syncFile: null,
          currentRevision: {
            id: 'rev-2',
            mode: 'INLINE_TEXT',
            contentHash: 'hash-2',
            contentText: '# B',
            syncObjectKey: null,
            storageRevision: null,
          },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.workspaceContentOutbox.create
      .mockResolvedValueOnce({ id: 'outbox-1' })
      .mockResolvedValueOnce({ id: 'outbox-2' });

    const result = await service.rebuildActiveDocuments();

    expect(result).toBe(2);
    expect(prismaMock.workspaceDocument.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        OR: [
          { currentRevisionId: { not: null } },
          { syncFile: { isNot: null } },
        ],
      },
      orderBy: [{ id: 'asc' }],
      take: 500,
      select: expect.any(Object),
    });
    expect(prismaMock.workspaceDocument.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: { gt: 'doc-1' },
        OR: [
          { currentRevisionId: { not: null } },
          { syncFile: { isNot: null } },
        ],
      },
      orderBy: [{ id: 'asc' }],
      take: 500,
      select: expect.any(Object),
    });
  });

  it('counts rebuild limits against enqueued documents instead of scanned documents', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          workspaceId: 'workspace-1',
          path: 'notes/a.md',
          title: 'A',
          mimeType: 'text/markdown',
          currentRevisionId: 'rev-1',
          workspace: { userId: 'user-1' },
          syncFile: null,
          currentRevision: {
            id: 'rev-1',
            mode: 'INLINE_TEXT',
            contentHash: 'hash-1',
            contentText: '# A',
            syncObjectKey: null,
            storageRevision: null,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'doc-2',
          workspaceId: 'workspace-1',
          path: 'notes/b.md',
          title: 'B',
          mimeType: 'text/markdown',
          currentRevisionId: 'rev-2',
          workspace: { userId: 'user-1' },
          syncFile: null,
          currentRevision: {
            id: 'rev-2',
            mode: 'INLINE_TEXT',
            contentHash: 'hash-2',
            contentText: '# B',
            syncObjectKey: null,
            storageRevision: null,
          },
        },
      ]);
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prismaMock.workspaceContentOutbox.create.mockResolvedValueOnce({
      id: 'outbox-2',
    });

    const result = await service.rebuildActiveDocuments({
      workspaceId: 'workspace-1',
      limit: 1,
    });

    expect(result).toBe(1);
    expect(prismaMock.workspaceDocument.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        workspaceId: 'workspace-1',
        OR: [
          { currentRevisionId: { not: null } },
          { syncFile: { isNot: null } },
        ],
      },
      orderBy: [{ id: 'asc' }],
      take: 500,
      select: expect.any(Object),
    });
    expect(prismaMock.workspaceDocument.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        workspaceId: 'workspace-1',
        id: { gt: 'doc-1' },
        OR: [
          { currentRevisionId: { not: null } },
          { syncFile: { isNot: null } },
        ],
      },
      orderBy: [{ id: 'asc' }],
      take: 500,
      select: expect.any(Object),
    });
    expect(prismaMock.workspaceContentOutbox.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.workspaceContentOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentId: 'doc-2',
        revisionId: 'rev-2',
        eventType: WorkspaceContentOutboxEventType.UPSERT,
      }),
    });
  });

  it('enqueues canonical delete state when the current revision has already been cleared', async () => {
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'doc-3',
      workspaceId: 'workspace-1',
      path: 'notes/c.md',
      title: 'C',
      mimeType: 'text/markdown',
      currentRevisionId: null,
      workspace: { userId: 'user-1' },
      syncFile: null,
      currentRevision: null,
    });
    prismaMock.workspaceContentOutbox.count.mockResolvedValue(0);
    prismaMock.workspaceContentOutbox.create.mockResolvedValue({
      id: 'outbox-2',
    });

    const result = await service.enqueueDocumentState('doc-3');

    expect(result).toBe(true);
    expect(prismaMock.workspaceContentOutbox.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'workspace-1',
        documentId: 'doc-3',
        revisionId: null,
        eventType: WorkspaceContentOutboxEventType.DELETE,
        payload: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          documentId: 'doc-3',
        },
      },
    });
  });

  it('does not enqueue delete state for a live sync file that has no current revision yet', async () => {
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'doc-4',
      workspaceId: 'workspace-1',
      path: 'notes/d.md',
      title: 'D',
      mimeType: 'text/markdown',
      currentRevisionId: null,
      workspace: { userId: 'user-1' },
      syncFile: {
        id: 'sync-4',
        isDeleted: false,
      },
      currentRevision: null,
    });

    const result = await service.enqueueDocumentState('doc-4');

    expect(result).toBe(false);
    expect(prismaMock.workspaceContentOutbox.count).not.toHaveBeenCalled();
    expect(prismaMock.workspaceContentOutbox.create).not.toHaveBeenCalled();
  });

  it('can enqueue delete state from a tombstone when the document row is already gone', async () => {
    prismaMock.workspaceContentOutbox.count.mockResolvedValue(0);
    prismaMock.workspaceContentOutbox.create.mockResolvedValue({
      id: 'outbox-delete-tombstone',
    });

    const result = await service.enqueueDeletedDocumentState({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'doc-deleted',
    });

    expect(result).toBe(true);
    expect(prismaMock.workspaceContentOutbox.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'workspace-1',
        documentId: 'doc-deleted',
        revisionId: null,
        eventType: WorkspaceContentOutboxEventType.DELETE,
        payload: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          documentId: 'doc-deleted',
        },
      },
    });
  });
});
