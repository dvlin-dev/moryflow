import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceContentOutboxEventType } from '../../generated/prisma/enums';
import { MemoxGatewayError } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import { MemoxWorkspaceContentReconcileService } from './memox-workspace-content-reconcile.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('MemoxWorkspaceContentReconcileService', () => {
  let prismaMock: MockPrismaService;
  let memoxClient: {
    getSourceIdentity: ReturnType<typeof vi.fn>;
  };
  let controlService: {
    enqueueDocumentState: ReturnType<typeof vi.fn>;
  };
  let service: MemoxWorkspaceContentReconcileService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    memoxClient = {
      getSourceIdentity: vi.fn(),
    };
    controlService = {
      enqueueDocumentState: vi.fn().mockResolvedValue(true),
    };
    service = new MemoxWorkspaceContentReconcileService(
      prismaMock as never,
      memoxClient as never,
      new MemoxSourceBridgeService(),
      controlService as never,
    );
  });

  it('re-enqueues the current revision when the remote source is missing after a processed upsert', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          workspaceId: 'workspace-1',
          currentRevisionId: 'rev-1',
          syncFile: null,
          workspace: { userId: 'user-1' },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    prismaMock.workspaceContentOutbox.findFirst.mockResolvedValue(null);
    memoxClient.getSourceIdentity.mockRejectedValue(
      new MemoxGatewayError('Not Found', 404, 'SOURCE_IDENTITY_NOT_FOUND'),
    );

    const result = await service.reconcile({
      now: new Date('2026-03-21T10:30:00.000Z'),
    });

    expect(result).toBe(1);
    expect(controlService.enqueueDocumentState).toHaveBeenCalledWith('doc-1');
  });

  it('re-enqueues a dead-lettered current revision after the cooldown elapses', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-2',
          workspaceId: 'workspace-1',
          currentRevisionId: 'rev-2',
          syncFile: null,
          workspace: { userId: 'user-1' },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count.mockResolvedValueOnce(0);
    prismaMock.workspaceContentOutbox.findFirst.mockResolvedValue({
      deadLetteredAt: new Date('2026-03-21T10:00:00.000Z'),
    });

    const result = await service.reconcile({
      now: new Date('2026-03-21T10:20:00.000Z'),
    });

    expect(result).toBe(1);
    expect(controlService.enqueueDocumentState).toHaveBeenCalledWith('doc-2');
    expect(memoxClient.getSourceIdentity).not.toHaveBeenCalled();
  });

  it('does not enqueue when the current revision is already healthy', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-3',
          workspaceId: 'workspace-1',
          currentRevisionId: 'rev-3',
          syncFile: null,
          workspace: { userId: 'user-1' },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    prismaMock.workspaceContentOutbox.findFirst.mockResolvedValue(null);
    memoxClient.getSourceIdentity.mockResolvedValue({
      source_id: 'source-3',
    });

    const result = await service.reconcile({
      now: new Date('2026-03-21T10:30:00.000Z'),
    });

    expect(result).toBe(0);
    expect(controlService.enqueueDocumentState).not.toHaveBeenCalled();
  });

  it('does not re-enqueue a current revision that was already quiet-skipped', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-quiet-skip',
          workspaceId: 'workspace-1',
          currentRevisionId: 'rev-quiet-skip',
          syncFile: null,
          workspace: { userId: 'user-1' },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    prismaMock.workspaceContentOutbox.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        resultDisposition: 'QUIET_SKIPPED',
      });

    const result = await service.reconcile({
      now: new Date('2026-03-21T10:30:00.000Z'),
    });

    expect(result).toBe(0);
    expect(controlService.enqueueDocumentState).not.toHaveBeenCalled();
    expect(memoxClient.getSourceIdentity).not.toHaveBeenCalled();
  });

  it('re-enqueues delete state when the document no longer has a current revision but the remote source still exists', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-4',
          workspaceId: 'workspace-1',
          currentRevisionId: null,
          syncFile: { id: 'sync-4' },
          workspace: { userId: 'user-1' },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count.mockResolvedValueOnce(0);
    prismaMock.workspaceContentOutbox.findFirst.mockResolvedValue(null);
    memoxClient.getSourceIdentity.mockResolvedValue({
      source_id: 'source-4',
    });

    const result = await service.reconcile({
      now: new Date('2026-03-21T10:30:00.000Z'),
    });

    expect(result).toBe(1);
    expect(controlService.enqueueDocumentState).toHaveBeenCalledWith('doc-4');
  });

  it('checks canonical outbox state using the matching event type and revision pointer', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-5',
          workspaceId: 'workspace-1',
          currentRevisionId: 'rev-5',
          syncFile: null,
          workspace: { userId: 'user-1' },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count.mockResolvedValueOnce(1);

    await service.reconcile({
      now: new Date('2026-03-21T10:30:00.000Z'),
    });

    expect(prismaMock.workspaceContentOutbox.count).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-5',
        revisionId: 'rev-5',
        eventType: WorkspaceContentOutboxEventType.UPSERT,
        processedAt: null,
        deadLetteredAt: null,
      },
    });
    expect(controlService.enqueueDocumentState).not.toHaveBeenCalled();
  });

  it('pages through reconcile candidates until the requested limit is exhausted', async () => {
    prismaMock.workspaceDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          workspaceId: 'workspace-1',
          currentRevisionId: 'rev-1',
          syncFile: null,
          workspace: { userId: 'user-1' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'doc-2',
          workspaceId: 'workspace-1',
          currentRevisionId: 'rev-2',
          syncFile: null,
          workspace: { userId: 'user-1' },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.workspaceContentOutbox.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    prismaMock.workspaceContentOutbox.findFirst.mockResolvedValue(null);
    memoxClient.getSourceIdentity.mockRejectedValue(
      new MemoxGatewayError('Not Found', 404, 'SOURCE_IDENTITY_NOT_FOUND'),
    );

    const result = await service.reconcile({
      limit: 2,
      now: new Date('2026-03-21T10:30:00.000Z'),
    });

    expect(result).toBe(2);
    expect(prismaMock.workspaceDocument.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.not.objectContaining({
          id: expect.anything(),
        }),
      }),
    );
    expect(prismaMock.workspaceDocument.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: { gt: 'doc-1' },
        }),
      }),
    );
    expect(controlService.enqueueDocumentState).toHaveBeenCalledWith('doc-1');
    expect(controlService.enqueueDocumentState).toHaveBeenCalledWith('doc-2');
  });
});
