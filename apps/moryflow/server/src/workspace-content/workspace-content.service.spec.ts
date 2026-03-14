import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkspaceContentService } from './workspace-content.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('WorkspaceContentService', () => {
  let service: WorkspaceContentService;
  let prismaMock: MockPrismaService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) =>
        callback(prismaMock),
    );
    service = new WorkspaceContentService(prismaMock as never);
  });

  it('rejects batch upsert when the workspace does not belong to the user', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'other-user',
    });

    await expect(
      service.batchUpsert('user-1', {
        workspaceId: 'workspace-1',
        documents: [
          {
            documentId: 'doc-1',
            path: '/Doc.md',
            title: 'Doc',
            mimeType: 'text/markdown',
            contentHash: 'hash-1',
            mode: 'inline_text',
            contentText: '# Hello',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects batch upsert when documentId belongs to another workspace', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: { id: 'vault-1' },
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      workspaceId: 'workspace-2',
    });

    await expect(
      service.batchUpsert('user-1', {
        workspaceId: 'workspace-1',
        documents: [
          {
            documentId: 'doc-1',
            path: '/Doc.md',
            title: 'Doc',
            mimeType: 'text/markdown',
            contentHash: 'hash-1',
            mode: 'inline_text',
            contentText: '# Hello',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects sync object refs that do not belong to the workspace sync vault', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: { id: 'vault-expected' },
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue(null);

    await expect(
      service.batchUpsert('user-1', {
        workspaceId: 'workspace-1',
        documents: [
          {
            documentId: 'doc-1',
            path: '/Doc.md',
            title: 'Doc',
            mimeType: 'text/markdown',
            contentHash: 'hash-1',
            mode: 'sync_object_ref',
            vaultId: 'vault-other',
            fileId: 'file-1',
            storageRevision: 'storage-rev-1',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('reuses an existing revision when documentId + contentHash already exists', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: { id: 'vault-1' },
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      workspaceId: 'workspace-1',
    });
    prismaMock.workspaceDocument.upsert.mockResolvedValue({
      id: 'doc-1',
      workspaceId: 'workspace-1',
      path: '/Renamed.md',
      title: 'Renamed',
      mimeType: 'text/markdown',
      currentRevisionId: 'rev-existing',
    });
    prismaMock.workspaceDocumentRevision.findUnique.mockResolvedValue({
      id: 'rev-existing',
      documentId: 'doc-1',
      contentHash: 'hash-1',
      mode: 'INLINE_TEXT',
      contentText: '# Hello',
      contentBytes: 7,
      syncObjectKey: null,
      storageRevision: null,
    });

    await service.batchUpsert('user-1', {
      workspaceId: 'workspace-1',
      documents: [
        {
          documentId: 'doc-1',
          path: '/Renamed.md',
          title: 'Renamed',
          mimeType: 'text/markdown',
          contentHash: 'hash-1',
          mode: 'inline_text',
          contentText: '# Hello',
        },
      ],
    });

    expect(prismaMock.workspaceDocumentRevision.create).not.toHaveBeenCalled();
    expect(prismaMock.workspaceDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { currentRevisionId: 'rev-existing' },
    });
    const reusedRevisionOutboxCall = prismaMock.workspaceContentOutbox.create
      .mock.calls[0]?.[0] as {
      data: {
        workspaceId: string;
        documentId: string;
        revisionId: string | null;
        eventType: string;
      };
    };
    expect(reusedRevisionOutboxCall.data).toMatchObject({
      workspaceId: 'workspace-1',
      documentId: 'doc-1',
      revisionId: 'rev-existing',
      eventType: 'UPSERT',
    });
  });

  it('creates a new revision and outbox event for new content', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: { id: 'vault-1' },
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue(null);
    prismaMock.workspaceDocument.upsert.mockResolvedValue({
      id: 'doc-2',
      workspaceId: 'workspace-1',
      path: '/Doc.md',
      title: 'Doc',
      mimeType: 'text/markdown',
      currentRevisionId: null,
    });
    prismaMock.workspaceDocumentRevision.findUnique.mockResolvedValue(null);
    prismaMock.workspaceDocumentRevision.create.mockResolvedValue({
      id: 'rev-new',
      documentId: 'doc-2',
      contentHash: 'hash-2',
      mode: 'SYNC_OBJECT_REF',
      contentText: null,
      contentBytes: 128,
      syncObjectKey: 'sync/user/workspace/doc-2/rev-2',
      storageRevision: 'storage-rev-2',
    });

    const result = await service.batchUpsert('user-1', {
      workspaceId: 'workspace-1',
      documents: [
        {
          documentId: 'doc-2',
          path: '/Doc.md',
          title: 'Doc',
          mimeType: 'text/markdown',
          contentHash: 'hash-2',
          mode: 'sync_object_ref',
          vaultId: 'vault-1',
          fileId: 'file-2',
          storageRevision: 'storage-rev-2',
        },
      ],
    });

    expect(prismaMock.workspaceDocumentRevision.create).toHaveBeenCalledWith({
      data: {
        documentId: 'doc-2',
        contentHash: 'hash-2',
        contentBytes: null,
        contentText: null,
        syncObjectKey: 'vault-1/file-2/storage-rev-2',
        storageRevision: 'storage-rev-2',
        mode: 'SYNC_OBJECT_REF',
      },
    });
    expect(prismaMock.workspaceDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc-2' },
      data: { currentRevisionId: 'rev-new' },
    });
    const newRevisionOutboxCall = prismaMock.workspaceContentOutbox.create.mock
      .calls[0]?.[0] as {
      data: {
        workspaceId: string;
        documentId: string;
        revisionId: string | null;
        eventType: string;
        payload: {
          mode: string;
          userId: string;
          workspaceId: string;
          documentId: string;
          contentHash: string;
          vaultId: string;
          fileId: string;
          storageRevision: string;
        };
      };
    };
    expect(newRevisionOutboxCall.data).toMatchObject({
      workspaceId: 'workspace-1',
      documentId: 'doc-2',
      revisionId: 'rev-new',
      eventType: 'UPSERT',
    });
    expect(newRevisionOutboxCall.data.payload).toMatchObject({
      mode: 'sync_object_ref',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      documentId: 'doc-2',
      contentHash: 'hash-2',
      vaultId: 'vault-1',
      fileId: 'file-2',
      storageRevision: 'storage-rev-2',
    });
    expect(result).toEqual({
      workspaceId: 'workspace-1',
      processedCount: 1,
      revisionCreatedCount: 1,
    });
  });

  it('reuses the persisted revision when concurrent create hits a unique conflict', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: null,
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue(null);
    prismaMock.workspaceDocument.upsert.mockResolvedValue({
      id: 'doc-race-1',
      workspaceId: 'workspace-1',
      path: '/Race.md',
      title: 'Race',
      mimeType: 'text/markdown',
      currentRevisionId: null,
    });
    prismaMock.workspaceDocumentRevision.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'rev-race-1',
        documentId: 'doc-race-1',
        contentHash: 'hash-race-1',
        mode: 'INLINE_TEXT',
        contentText: '# Race',
        contentBytes: 6,
        syncObjectKey: null,
        storageRevision: null,
      });
    prismaMock.workspaceDocumentRevision.create.mockRejectedValueOnce({
      code: 'P2002',
    });

    const result = await service.batchUpsert('user-1', {
      workspaceId: 'workspace-1',
      documents: [
        {
          documentId: 'doc-race-1',
          path: '/Race.md',
          title: 'Race',
          mimeType: 'text/markdown',
          contentHash: 'hash-race-1',
          mode: 'inline_text',
          contentText: '# Race',
        },
      ],
    });

    expect(prismaMock.workspaceDocumentRevision.create).toHaveBeenCalledTimes(
      1,
    );
    expect(prismaMock.workspaceDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc-race-1' },
      data: { currentRevisionId: 'rev-race-1' },
    });
    expect(result).toEqual({
      workspaceId: 'workspace-1',
      processedCount: 1,
      revisionCreatedCount: 0,
    });
  });

  it('creates delete outbox events and removes workspace documents', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: null,
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      workspaceId: 'workspace-1',
    });

    const result = await service.batchDelete('user-1', {
      workspaceId: 'workspace-1',
      documents: [{ documentId: 'doc-1' }],
    });

    expect(prismaMock.workspaceContentOutbox.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'workspace-1',
        documentId: 'doc-1',
        revisionId: null,
        eventType: 'DELETE',
        payload: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          documentId: 'doc-1',
        },
      },
    });
    expect(prismaMock.workspaceDocument.delete).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
    });
    expect(result).toEqual({
      workspaceId: 'workspace-1',
      processedCount: 1,
      deletedCount: 1,
    });
  });

  it('rejects deleting a document belonging to another workspace', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: null,
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      workspaceId: 'workspace-2',
    });

    await expect(
      service.batchDelete('user-1', {
        workspaceId: 'workspace-1',
        documents: [{ documentId: 'doc-1' }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prismaMock.workspaceContentOutbox.create).not.toHaveBeenCalled();
    expect(prismaMock.workspaceDocument.delete).not.toHaveBeenCalled();
  });

  it('keeps sync-backed document identity while removing revisions on delete', async () => {
    prismaMock.workspace.findUnique.mockResolvedValue({
      id: 'workspace-1',
      userId: 'user-1',
      syncVault: { id: 'vault-1' },
    });
    prismaMock.workspaceDocument.findUnique.mockResolvedValue({
      id: 'doc-sync-1',
      workspaceId: 'workspace-1',
      syncFile: { id: 'doc-sync-1' },
    });

    const result = await service.batchDelete('user-1', {
      workspaceId: 'workspace-1',
      documents: [{ documentId: 'doc-sync-1' }],
    });

    expect(prismaMock.workspaceContentOutbox.create).toHaveBeenCalledWith({
      data: {
        workspaceId: 'workspace-1',
        documentId: 'doc-sync-1',
        revisionId: null,
        eventType: 'DELETE',
        payload: {
          userId: 'user-1',
          workspaceId: 'workspace-1',
          documentId: 'doc-sync-1',
        },
      },
    });
    expect(prismaMock.workspaceDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc-sync-1' },
      data: { currentRevisionId: null },
    });
    expect(
      prismaMock.workspaceDocumentRevision.deleteMany,
    ).toHaveBeenCalledWith({
      where: { documentId: 'doc-sync-1' },
    });
    expect(prismaMock.workspaceDocument.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      workspaceId: 'workspace-1',
      processedCount: 1,
      deletedCount: 1,
    });
  });
});
