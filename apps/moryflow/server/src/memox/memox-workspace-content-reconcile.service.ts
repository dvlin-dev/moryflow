import { Injectable } from '@nestjs/common';
import {
  WorkspaceContentOutboxEventType,
  WorkspaceContentOutboxResultDisposition,
} from '../../generated/prisma/enums';
import { PrismaService } from '../prisma';
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

    return this.sourceExists(document);
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
      if (this.isMissingSourceIdentity(error)) {
        return false;
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

  private isMissingSourceIdentity(error: unknown): boolean {
    return (
      error instanceof MemoxGatewayError &&
      ((error.status === 404 && error.code === 'SOURCE_IDENTITY_NOT_FOUND') ||
        (error.status === 409 && error.code === 'SOURCE_IDENTITY_DELETED'))
    );
  }
}
