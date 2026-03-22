import { Injectable } from '@nestjs/common';
import {
  WorkspaceContentOutboxEventType,
  WorkspaceContentOutboxResultDisposition,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma';
import { WorkspaceContentDeletePayloadSchema } from './memox-source-contract';
import { MemoxClient, MemoxGatewayError } from './memox.client';
import { MemoxSourceBridgeService } from './memox-source-bridge.service';
import { MemoxWorkspaceContentControlService } from './memox-workspace-content-control.service';
import { MEMOX_WORKSPACE_CONTENT_RECONCILE_COOLDOWN_MS } from './memox-workspace-content.constants';

type ReconcileDocumentRecord = {
  id: string;
  workspaceId: string;
  currentRevisionId: string | null;
  syncFile: { id: string } | null;
  workspace: {
    userId: string;
  };
};

type DeletedDocumentTombstone = {
  documentId: string;
  workspaceId: string;
  payload: unknown;
};

@Injectable()
export class MemoxWorkspaceContentReconcileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoxClient: MemoxClient,
    private readonly bridgeService: MemoxSourceBridgeService,
    private readonly controlService: MemoxWorkspaceContentControlService,
  ) {}

  async reconcile(options?: {
    workspaceId?: string;
    limit?: number;
    now?: Date;
  }): Promise<number> {
    const limit = options?.limit ?? 100;
    let enqueuedCount = 0;
    const now = options?.now ?? new Date();
    let afterId: string | null = null;

    while (enqueuedCount < limit) {
      const documents: ReconcileDocumentRecord[] =
        await this.prisma.workspaceDocument.findMany({
          where: {
            ...(options?.workspaceId
              ? { workspaceId: options.workspaceId }
              : {}),
            ...(afterId ? { id: { gt: afterId } } : {}),
            OR: [
              { currentRevisionId: { not: null } },
              { syncFile: { isNot: null } },
            ],
          },
          orderBy: [{ id: 'asc' }],
          take: limit - enqueuedCount,
          select: {
            id: true,
            workspaceId: true,
            currentRevisionId: true,
            syncFile: {
              select: {
                id: true,
              },
            },
            workspace: {
              select: {
                userId: true,
              },
            },
          },
        });

      if (documents.length === 0) {
        break;
      }

      for (const document of documents) {
        const shouldEnqueue = document.currentRevisionId
          ? await this.shouldEnqueueUpsert(
              {
                ...document,
                currentRevisionId: document.currentRevisionId,
              },
              now,
            )
          : await this.shouldEnqueueDelete(
              {
                ...document,
                currentRevisionId: null,
              },
              now,
            );

        if (!shouldEnqueue) {
          continue;
        }

        if (await this.controlService.enqueueDocumentState(document.id)) {
          enqueuedCount += 1;
          if (enqueuedCount >= limit) {
            return enqueuedCount;
          }
        }
      }

      afterId = documents[documents.length - 1]?.id ?? null;
    }

    if (enqueuedCount >= limit) {
      return enqueuedCount;
    }

    let afterDeletedDocumentId: string | null = null;
    while (enqueuedCount < limit) {
      const tombstones: DeletedDocumentTombstone[] =
        ((await this.prisma.workspaceContentOutbox.findMany({
          where: {
            eventType: WorkspaceContentOutboxEventType.DELETE,
            ...(options?.workspaceId
              ? { workspaceId: options.workspaceId }
              : {}),
            ...(afterDeletedDocumentId
              ? { documentId: { gt: afterDeletedDocumentId } }
              : {}),
          },
          distinct: ['documentId'],
          orderBy: [{ documentId: 'asc' }],
          take: limit - enqueuedCount,
          select: {
            documentId: true,
            workspaceId: true,
            payload: true,
          },
        })) as DeletedDocumentTombstone[]) ?? [];

      if (tombstones.length === 0) {
        break;
      }

      for (const tombstone of tombstones) {
        const existingDocument = await this.prisma.workspaceDocument.findUnique(
          {
            where: { id: tombstone.documentId },
            select: { id: true },
          },
        );
        if (existingDocument) {
          continue;
        }

        const payload = WorkspaceContentDeletePayloadSchema.parse(
          tombstone.payload,
        );
        const tombstoneRecord: ReconcileDocumentRecord & {
          currentRevisionId: null;
        } = {
          id: payload.documentId,
          workspaceId: payload.workspaceId,
          currentRevisionId: null,
          syncFile: null,
          workspace: {
            userId: payload.userId,
          },
        };

        const shouldEnqueue = await this.shouldEnqueueDelete(
          tombstoneRecord,
          now,
        );
        if (!shouldEnqueue) {
          continue;
        }

        if (
          await this.controlService.enqueueDeletedDocumentState({
            userId: payload.userId,
            workspaceId: payload.workspaceId,
            documentId: payload.documentId,
          })
        ) {
          enqueuedCount += 1;
          if (enqueuedCount >= limit) {
            return enqueuedCount;
          }
        }
      }

      afterDeletedDocumentId =
        tombstones[tombstones.length - 1]?.documentId ?? null;
    }

    return enqueuedCount;
  }

  private async shouldEnqueueUpsert(
    document: ReconcileDocumentRecord & { currentRevisionId: string },
    now: Date,
  ): Promise<boolean> {
    if (
      await this.hasPendingEvent(
        document.id,
        document.currentRevisionId,
        WorkspaceContentOutboxEventType.UPSERT,
      )
    ) {
      return false;
    }

    const latestDeadLetteredAt = await this.getLatestDeadLetteredAt(
      document.id,
      document.currentRevisionId,
      WorkspaceContentOutboxEventType.UPSERT,
    );
    if (latestDeadLetteredAt) {
      return this.hasCooldownElapsed(latestDeadLetteredAt, now);
    }

    if (
      !(await this.hasProcessedEvent(
        document.id,
        document.currentRevisionId,
        WorkspaceContentOutboxEventType.UPSERT,
      ))
    ) {
      return true;
    }

    const latestProcessedDisposition = await this.getLatestProcessedDisposition(
      document.id,
      document.currentRevisionId,
      WorkspaceContentOutboxEventType.UPSERT,
    );
    if (
      latestProcessedDisposition ===
      WorkspaceContentOutboxResultDisposition.QUIET_SKIPPED
    ) {
      return false;
    }

    return !(await this.sourceExists(document));
  }

  private async shouldEnqueueDelete(
    document: ReconcileDocumentRecord & { currentRevisionId: null },
    now: Date,
  ): Promise<boolean> {
    if (
      await this.hasPendingEvent(
        document.id,
        null,
        WorkspaceContentOutboxEventType.DELETE,
      )
    ) {
      return false;
    }

    const latestDeadLetteredAt = await this.getLatestDeadLetteredAt(
      document.id,
      null,
      WorkspaceContentOutboxEventType.DELETE,
    );
    if (latestDeadLetteredAt) {
      return this.hasCooldownElapsed(latestDeadLetteredAt, now);
    }

    return this.sourceExists(document, { treatDeletedAsMissing: true });
  }

  private async hasPendingEvent(
    documentId: string,
    revisionId: string | null,
    eventType: WorkspaceContentOutboxEventType,
  ): Promise<boolean> {
    const count = await this.prisma.workspaceContentOutbox.count({
      where: {
        documentId,
        revisionId,
        eventType,
        processedAt: null,
        deadLetteredAt: null,
      },
    });

    return count > 0;
  }

  private async hasProcessedEvent(
    documentId: string,
    revisionId: string | null,
    eventType: WorkspaceContentOutboxEventType,
  ): Promise<boolean> {
    const count = await this.prisma.workspaceContentOutbox.count({
      where: {
        documentId,
        revisionId,
        eventType,
        processedAt: {
          not: null,
        },
      },
    });

    return count > 0;
  }

  private async getLatestDeadLetteredAt(
    documentId: string,
    revisionId: string | null,
    eventType: WorkspaceContentOutboxEventType,
  ): Promise<Date | null> {
    const event = await this.prisma.workspaceContentOutbox.findFirst({
      where: {
        documentId,
        revisionId,
        eventType,
        deadLetteredAt: {
          not: null,
        },
      },
      orderBy: {
        deadLetteredAt: 'desc',
      },
      select: {
        deadLetteredAt: true,
      },
    });

    return event?.deadLetteredAt ?? null;
  }

  private async getLatestProcessedDisposition(
    documentId: string,
    revisionId: string | null,
    eventType: WorkspaceContentOutboxEventType,
  ): Promise<WorkspaceContentOutboxResultDisposition | null> {
    const event = await this.prisma.workspaceContentOutbox.findFirst({
      where: {
        documentId,
        revisionId,
        eventType,
        processedAt: {
          not: null,
        },
      },
      orderBy: [{ processedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        resultDisposition: true,
      },
    });

    return event?.resultDisposition ?? null;
  }

  private async sourceExists(
    document: ReconcileDocumentRecord,
    options?: { treatDeletedAsMissing?: boolean },
  ): Promise<boolean> {
    const lookup = this.bridgeService.buildSourceIdentityLookupQuery({
      userId: document.workspace.userId,
      workspaceId: document.workspaceId,
      documentId: document.id,
    });

    try {
      await this.memoxClient.getSourceIdentity({
        sourceType: lookup.sourceType,
        externalId: lookup.externalId,
        query: lookup.query,
      });
      return true;
    } catch (error) {
      if (this.isSourceIdentityMissing(error)) {
        return false;
      }
      if (
        options?.treatDeletedAsMissing &&
        this.isDeletedSourceIdentity(error)
      ) {
        return false;
      }
      if (this.isDeletedSourceIdentity(error)) {
        return true;
      }
      throw error;
    }
  }

  private hasCooldownElapsed(deadLetteredAt: Date, now: Date): boolean {
    return (
      now.getTime() - deadLetteredAt.getTime() >=
      MEMOX_WORKSPACE_CONTENT_RECONCILE_COOLDOWN_MS
    );
  }

  private isSourceIdentityMissing(error: unknown): boolean {
    return (
      error instanceof MemoxGatewayError &&
      error.status === 404 &&
      error.code === 'SOURCE_IDENTITY_NOT_FOUND'
    );
  }

  private isDeletedSourceIdentity(error: unknown): boolean {
    return (
      error instanceof MemoxGatewayError &&
      error.status === 409 &&
      error.code === 'SOURCE_IDENTITY_DELETED'
    );
  }
}
