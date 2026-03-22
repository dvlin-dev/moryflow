import { Injectable } from '@nestjs/common';
import { WorkspaceContentOutboxEventType } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma';
import {
  MEMOX_WORKSPACE_CONTENT_CONSUMER_ID,
  MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_BATCH_LIMIT,
  MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_MAX_BATCHES,
  MEMOX_WORKSPACE_CONTENT_LEASE_MS,
} from './memox-workspace-content.constants';
import { MemoxWorkspaceContentConsumerService } from './memox-workspace-content-consumer.service';
import {
  buildWorkspaceContentDeleteOutboxPayload,
  buildWorkspaceContentUpsertOutboxPayload,
} from '../workspace-content/workspace-content-outbox.utils';
import type { WorkspaceContentDeletePayload } from './memox-source-contract';

export interface MemoxWorkspaceContentReplayOptions {
  batchSize?: number;
  maxBatches?: number;
  leaseMs?: number;
  consumerId?: string;
}

export interface MemoxWorkspaceContentReplayResult {
  claimed: number;
  acknowledged: number;
  failedIds: string[];
  deadLetteredIds: string[];
  drained: boolean;
  pendingCount: number;
  deadLetteredCount: number;
}

type CanonicalWorkspaceDocumentRecord = {
  id: string;
  workspaceId: string;
  path: string;
  title: string;
  mimeType: string | null;
  currentRevisionId: string | null;
  workspace: {
    userId: string;
  };
  syncFile: {
    id: string;
    isDeleted: boolean;
  } | null;
  currentRevision: {
    id: string;
    mode: 'INLINE_TEXT' | 'SYNC_OBJECT_REF';
    contentHash: string;
    contentText: string | null;
    syncObjectKey: string | null;
    storageRevision: string | null;
  } | null;
};

const CANONICAL_WORKSPACE_DOCUMENT_SELECT = {
  id: true,
  workspaceId: true,
  path: true,
  title: true,
  mimeType: true,
  currentRevisionId: true,
  workspace: {
    select: {
      userId: true,
    },
  },
  syncFile: {
    select: {
      id: true,
      isDeleted: true,
    },
  },
  currentRevision: {
    select: {
      id: true,
      mode: true,
      contentHash: true,
      contentText: true,
      syncObjectKey: true,
      storageRevision: true,
    },
  },
} as const;

@Injectable()
export class MemoxWorkspaceContentControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consumerService: MemoxWorkspaceContentConsumerService,
  ) {}

  async redriveDeadLetters(limit: number): Promise<number> {
    if (limit <= 0) {
      return 0;
    }

    const candidates = await this.prisma.workspaceContentOutbox.findMany({
      where: {
        deadLetteredAt: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      select: {
        id: true,
      },
    });

    const ids = candidates.map((candidate) => candidate.id);
    if (ids.length === 0) {
      return 0;
    }

    const result = await this.prisma.workspaceContentOutbox.updateMany({
      where: {
        id: {
          in: ids,
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

    return result.count;
  }

  async rebuildActiveDocuments(options?: {
    workspaceId?: string;
    limit?: number;
  }): Promise<number> {
    let enqueuedCount = 0;
    let scannedCount = 0;
    let cursorId: string | null = null;
    const remainingLimit = options?.limit ?? Number.POSITIVE_INFINITY;

    while (scannedCount < remainingLimit) {
      const batchSize = Number.isFinite(remainingLimit)
        ? Math.min(500, remainingLimit - scannedCount)
        : 500;
      if (batchSize <= 0) {
        break;
      }

      const documents = (await this.prisma.workspaceDocument.findMany({
        where: {
          ...(options?.workspaceId ? { workspaceId: options.workspaceId } : {}),
          ...(cursorId ? { id: { gt: cursorId } } : {}),
          OR: [
            { currentRevisionId: { not: null } },
            { syncFile: { isNot: null } },
          ],
        },
        orderBy: [{ id: 'asc' }],
        take: batchSize,
        select: CANONICAL_WORKSPACE_DOCUMENT_SELECT,
      })) as CanonicalWorkspaceDocumentRecord[];

      if (documents.length === 0) {
        break;
      }

      for (const document of documents) {
        scannedCount += 1;
        if (await this.enqueueDocumentStateRecord(document)) {
          enqueuedCount += 1;
        }
      }

      cursorId = documents.at(-1)?.id ?? null;
    }

    return enqueuedCount;
  }

  async enqueueDocumentState(documentId: string): Promise<boolean> {
    const document = (await this.prisma.workspaceDocument.findUnique({
      where: { id: documentId },
      select: CANONICAL_WORKSPACE_DOCUMENT_SELECT,
    })) as CanonicalWorkspaceDocumentRecord | null;

    if (!document) {
      return false;
    }

    return this.enqueueDocumentStateRecord(document);
  }

  async enqueueDeletedDocumentState(
    payload: WorkspaceContentDeletePayload,
  ): Promise<boolean> {
    return this.enqueueDeletePayload(payload);
  }

  async replayOutbox(
    options: MemoxWorkspaceContentReplayOptions = {},
  ): Promise<MemoxWorkspaceContentReplayResult> {
    const batchSize = Math.min(
      options.batchSize ?? MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_BATCH_LIMIT,
      MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_BATCH_LIMIT,
    );
    const maxBatches = Math.min(
      options.maxBatches ?? MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_MAX_BATCHES,
      MEMOX_WORKSPACE_CONTENT_HTTP_REPLAY_MAX_BATCHES,
    );
    const leaseMs = options.leaseMs ?? MEMOX_WORKSPACE_CONTENT_LEASE_MS;
    const consumerId =
      options.consumerId ?? MEMOX_WORKSPACE_CONTENT_CONSUMER_ID;
    const failedIds: string[] = [];
    const deadLetteredIds: string[] = [];
    let claimed = 0;
    let acknowledged = 0;

    for (let batch = 0; batch < maxBatches; batch += 1) {
      const result = await this.consumerService.processBatch({
        consumerId,
        limit: batchSize,
        leaseMs,
      });
      claimed += result.claimed;
      acknowledged += result.acknowledged;
      failedIds.push(...result.failedIds);
      deadLetteredIds.push(...result.deadLetteredIds);

      if (result.claimed < batchSize) {
        break;
      }
    }

    const backlog = await this.getBacklogState();

    return {
      claimed,
      acknowledged,
      failedIds,
      deadLetteredIds,
      drained: backlog.pendingCount === 0 && backlog.deadLetteredCount === 0,
      pendingCount: backlog.pendingCount,
      deadLetteredCount: backlog.deadLetteredCount,
    };
  }

  private async enqueueDocumentStateRecord(
    document: CanonicalWorkspaceDocumentRecord,
  ): Promise<boolean> {
    if (document.currentRevisionId && document.currentRevision) {
      const pendingCount = await this.prisma.workspaceContentOutbox.count({
        where: {
          documentId: document.id,
          revisionId: document.currentRevisionId,
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          processedAt: null,
          deadLetteredAt: null,
        },
      });
      if (pendingCount > 0) {
        return false;
      }

      await this.prisma.workspaceContentOutbox.create({
        data: {
          workspaceId: document.workspaceId,
          documentId: document.id,
          revisionId: document.currentRevisionId,
          eventType: WorkspaceContentOutboxEventType.UPSERT,
          payload: buildWorkspaceContentUpsertOutboxPayload({
            userId: document.workspace.userId,
            workspaceId: document.workspaceId,
            document: {
              documentId: document.id,
              path: document.path,
              title: document.title,
              mimeType: document.mimeType,
            },
            revision: {
              mode: document.currentRevision.mode,
              contentHash: document.currentRevision.contentHash,
              contentText: document.currentRevision.contentText,
              syncObjectKey: document.currentRevision.syncObjectKey,
              storageRevision: document.currentRevision.storageRevision,
            },
          }),
        },
      });
      return true;
    }

    if (document.syncFile && !document.syncFile.isDeleted) {
      return false;
    }

    return this.enqueueDeletePayload({
      userId: document.workspace.userId,
      workspaceId: document.workspaceId,
      documentId: document.id,
    });
  }

  private async enqueueDeletePayload(
    payload: WorkspaceContentDeletePayload,
  ): Promise<boolean> {
    const pendingDeleteCount = await this.prisma.workspaceContentOutbox.count({
      where: {
        documentId: payload.documentId,
        revisionId: null,
        eventType: WorkspaceContentOutboxEventType.DELETE,
        processedAt: null,
        deadLetteredAt: null,
      },
    });
    if (pendingDeleteCount > 0) {
      return false;
    }

    await this.prisma.workspaceContentOutbox.create({
      data: {
        workspaceId: payload.workspaceId,
        documentId: payload.documentId,
        revisionId: null,
        eventType: WorkspaceContentOutboxEventType.DELETE,
        payload: buildWorkspaceContentDeleteOutboxPayload(payload),
      },
    });

    return true;
  }

  private async getBacklogState(): Promise<{
    pendingCount: number;
    deadLetteredCount: number;
  }> {
    const [pendingCount, deadLetteredCount] = await Promise.all([
      this.prisma.workspaceContentOutbox.count({
        where: {
          processedAt: null,
          deadLetteredAt: null,
        },
      }),
      this.prisma.workspaceContentOutbox.count({
        where: {
          deadLetteredAt: {
            not: null,
          },
        },
      }),
    ]);

    return {
      pendingCount,
      deadLetteredCount,
    };
  }
}
