import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { resolveSyncDocumentTitle } from '@moryflow/sync';
import { createDocumentWorkspaceMismatchConflict } from '../common/errors/workspace-document.errors';
import { PrismaService } from '../prisma';
import type {
  WorkspaceContentBatchDeleteInput,
  WorkspaceContentBatchDeleteResponseDto,
  WorkspaceContentBatchUpsertInput,
  WorkspaceContentBatchUpsertResponseDto,
  WorkspaceContentDocumentInput,
} from './dto/workspace-content.dto';
import {
  buildWorkspaceContentDeleteOutboxPayload,
  buildWorkspaceContentUpsertOutboxPayload,
} from './workspace-content-outbox.utils';

type NormalizedWorkspaceContentDocumentInput = WorkspaceContentDocumentInput & {
  title: string;
};

type WorkspaceContentDocumentLookupTx = {
  workspaceDocument: Pick<PrismaService['workspaceDocument'], 'findUnique'>;
  workspaceDocumentRevision: Pick<
    PrismaService['workspaceDocumentRevision'],
    'findUnique' | 'create' | 'deleteMany'
  >;
};

@Injectable()
export class WorkspaceContentService {
  constructor(private readonly prisma: PrismaService) {}

  async batchUpsert(
    userId: string,
    input: WorkspaceContentBatchUpsertInput,
  ): Promise<WorkspaceContentBatchUpsertResponseDto> {
    let revisionCreatedCount = 0;

    const workspace = await this.prisma.$transaction(
      async (tx) => {
        const ws = await this.getOwnedWorkspace(tx, userId, input.workspaceId);

        for (const documentInput of input.documents) {
          const normalizedDocumentInput =
            this.normalizeDocumentInput(documentInput);
          await this.assertDocumentBelongsToWorkspace(
            tx,
            ws.id,
            normalizedDocumentInput.documentId,
          );
          this.assertSyncObjectRefBelongsToWorkspace(
            ws,
            normalizedDocumentInput,
          );

          // Clear any other document occupying the target path to prevent
          // unique-constraint violations during path-swap renames within
          // the same batch. The displaced document's path is set to its
          // own id (globally unique) as a safe fallback.
          await tx.$executeRaw`
          UPDATE "WorkspaceDocument"
          SET "path" = "id"
          WHERE "workspaceId" = ${ws.id}
            AND "path" = ${normalizedDocumentInput.path}
            AND "id" != ${normalizedDocumentInput.documentId}
        `;

          const document = await tx.workspaceDocument.upsert({
            where: { id: normalizedDocumentInput.documentId },
            create: {
              id: normalizedDocumentInput.documentId,
              workspaceId: ws.id,
              path: normalizedDocumentInput.path,
              title: normalizedDocumentInput.title,
              mimeType: normalizedDocumentInput.mimeType ?? null,
            },
            update: {
              path: normalizedDocumentInput.path,
              title: normalizedDocumentInput.title,
              mimeType: normalizedDocumentInput.mimeType ?? null,
            },
          });

          const { revision, created } = await this.ensureRevision(
            tx,
            document.id,
            normalizedDocumentInput,
          );
          if (created) {
            revisionCreatedCount += 1;
          }

          await tx.workspaceDocument.update({
            where: { id: document.id },
            data: { currentRevisionId: revision.id },
          });

          await tx.workspaceContentOutbox.create({
            data: {
              workspaceId: ws.id,
              documentId: document.id,
              revisionId: revision.id,
              eventType: 'UPSERT',
              payload: buildWorkspaceContentUpsertOutboxPayload({
                userId,
                workspaceId: ws.id,
                document: {
                  documentId: normalizedDocumentInput.documentId,
                  path: normalizedDocumentInput.path,
                  title: normalizedDocumentInput.title,
                  mimeType: normalizedDocumentInput.mimeType ?? null,
                },
                revision:
                  normalizedDocumentInput.mode === 'inline_text'
                    ? {
                        mode: 'INLINE_TEXT',
                        contentHash: normalizedDocumentInput.contentHash,
                        contentText: normalizedDocumentInput.contentText,
                        contentBytes: normalizedDocumentInput.contentBytes,
                      }
                    : {
                        mode: 'SYNC_OBJECT_REF',
                        contentHash: normalizedDocumentInput.contentHash,
                        syncObjectKey: `${normalizedDocumentInput.vaultId}/${normalizedDocumentInput.fileId}/${normalizedDocumentInput.storageRevision}`,
                        storageRevision:
                          normalizedDocumentInput.storageRevision,
                      },
              }),
            },
          });
        }

        return ws;
      },
      { timeout: 30_000 },
    );

    return {
      workspaceId: workspace.id,
      processedCount: input.documents.length,
      revisionCreatedCount,
    };
  }

  private normalizeDocumentInput(
    input: WorkspaceContentDocumentInput,
  ): NormalizedWorkspaceContentDocumentInput {
    return {
      ...input,
      title: resolveSyncDocumentTitle(input.path),
    };
  }

  async batchDelete(
    userId: string,
    input: WorkspaceContentBatchDeleteInput,
  ): Promise<WorkspaceContentBatchDeleteResponseDto> {
    let deletedCount = 0;

    const workspace = await this.prisma.$transaction(
      async (tx) => {
        const ws = await this.getOwnedWorkspace(tx, userId, input.workspaceId);

        for (const documentInput of input.documents) {
          const existingDocument = await this.assertDocumentBelongsToWorkspace(
            tx,
            ws.id,
            documentInput.documentId,
          );

          if (!existingDocument) {
            continue;
          }

          await tx.workspaceContentOutbox.create({
            data: {
              workspaceId: ws.id,
              documentId: existingDocument.id,
              revisionId: null,
              eventType: 'DELETE',
              payload: buildWorkspaceContentDeleteOutboxPayload({
                userId,
                workspaceId: ws.id,
                documentId: existingDocument.id,
              }),
            },
          });

          if (existingDocument.syncFile) {
            await tx.workspaceDocument.update({
              where: { id: existingDocument.id },
              data: { currentRevisionId: null },
            });
            await tx.workspaceDocumentRevision.deleteMany({
              where: { documentId: existingDocument.id },
            });
          } else {
            await tx.workspaceDocument.delete({
              where: { id: existingDocument.id },
            });
          }

          deletedCount += 1;
        }

        return ws;
      },
      { timeout: 30_000 },
    );

    return {
      workspaceId: workspace.id,
      processedCount: input.documents.length,
      deletedCount,
    };
  }

  private async getOwnedWorkspace(
    tx: { workspace: Pick<PrismaService['workspace'], 'findUnique'> },
    userId: string,
    workspaceId: string,
  ) {
    const workspace = await tx.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        userId: true,
        syncVault: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!workspace || workspace.userId !== userId) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  private async assertDocumentBelongsToWorkspace(
    tx: WorkspaceContentDocumentLookupTx,
    workspaceId: string,
    documentId: string,
  ): Promise<{
    id: string;
    workspaceId: string;
    currentRevisionId: string | null;
    syncFile: {
      id: string;
    } | null;
  } | null> {
    const existingDocument = await tx.workspaceDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        workspaceId: true,
        currentRevisionId: true,
        syncFile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (existingDocument && existingDocument.workspaceId !== workspaceId) {
      throw createDocumentWorkspaceMismatchConflict();
    }

    return existingDocument;
  }

  private async ensureRevision(
    tx: WorkspaceContentDocumentLookupTx,
    documentId: string,
    input: NormalizedWorkspaceContentDocumentInput,
  ): Promise<{
    revision: {
      id: string;
    };
    created: boolean;
  }> {
    const existing = await tx.workspaceDocumentRevision.findUnique({
      where: {
        documentId_contentHash: {
          documentId,
          contentHash: input.contentHash,
        },
      },
    });
    if (existing) {
      return {
        revision: existing,
        created: false,
      };
    }

    try {
      const created = await tx.workspaceDocumentRevision.create({
        data: this.toRevisionCreateInput(documentId, input),
      });
      return {
        revision: created,
        created: true,
      };
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') {
        throw error;
      }

      const conflicted = await tx.workspaceDocumentRevision.findUnique({
        where: {
          documentId_contentHash: {
            documentId,
            contentHash: input.contentHash,
          },
        },
      });
      if (!conflicted) {
        throw error;
      }

      return {
        revision: conflicted,
        created: false,
      };
    }
  }

  private assertSyncObjectRefBelongsToWorkspace(
    workspace: {
      syncVault: {
        id: string;
      } | null;
    },
    input: WorkspaceContentDocumentInput,
  ): void {
    if (input.mode !== 'sync_object_ref') {
      return;
    }

    if (!workspace.syncVault || input.vaultId !== workspace.syncVault.id) {
      throw new ConflictException(
        'Sync object reference does not belong to current workspace sync vault',
      );
    }
  }

  private toRevisionCreateInput(
    documentId: string,
    input: NormalizedWorkspaceContentDocumentInput,
  ) {
    if (input.mode === 'inline_text') {
      return {
        documentId,
        contentHash: input.contentHash,
        contentBytes:
          input.contentBytes ?? Buffer.byteLength(input.contentText),
        contentText: input.contentText,
        syncObjectKey: null,
        storageRevision: null,
        mode: 'INLINE_TEXT' as const,
      };
    }

    return {
      documentId,
      contentHash: input.contentHash,
      contentBytes: null,
      contentText: null,
      syncObjectKey: `${input.vaultId}/${input.fileId}/${input.storageRevision}`,
      storageRevision: input.storageRevision,
      mode: 'SYNC_OBJECT_REF' as const,
    };
  }
}
