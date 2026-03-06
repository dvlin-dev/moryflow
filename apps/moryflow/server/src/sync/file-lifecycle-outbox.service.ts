/**
 * [INPUT]: sync commit 成功后的文件事实变化
 * [OUTPUT]: file lifecycle outbox 记录
 * [POS]: Sync 与 projection 域的解耦边界，只负责写入文件生命周期事件
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import type { VectorClock } from '@moryflow/sync';
import { PrismaService } from '../prisma';

export interface ExistingSyncFileState {
  path: string;
  title: string;
  size: number;
  contentHash: string;
  storageRevision: string;
  vectorClock: VectorClock;
  isDeleted: boolean;
}

export interface PublishedSyncFile {
  fileId: string;
  path: string;
  title: string;
  size: number;
  contentHash: string;
  storageRevision: string;
  vectorClock: VectorClock;
}

export interface DeletedSyncFile {
  fileId: string;
}

interface FileLifecycleOutboxWriter {
  fileLifecycleOutbox: {
    findMany: (args: {
      where?: Prisma.FileLifecycleOutboxWhereInput;
      orderBy?: Prisma.FileLifecycleOutboxOrderByWithRelationInput;
      take?: number;
    }) => Promise<FileLifecycleOutboxRecord[]>;
    createMany: (args: {
      data: Prisma.FileLifecycleOutboxCreateManyInput[];
    }) => Promise<unknown>;
    updateMany: (args: {
      where: Prisma.FileLifecycleOutboxWhereInput;
      data: Prisma.FileLifecycleOutboxUpdateManyMutationInput;
    }) => Promise<{ count: number }>;
  };
  $transaction?: PrismaService['$transaction'];
}

export interface FileLifecycleOutboxRecord {
  id: string;
  userId: string;
  vaultId: string;
  fileId: string;
  eventType: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
  processedAt: Date | null;
  leasedBy: string | null;
  leaseExpiresAt: Date | null;
}

export interface ClaimPendingBatchOptions {
  consumerId: string;
  limit: number;
  leaseMs: number;
  now?: Date;
}

@Injectable()
export class FileLifecycleOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async appendSyncCommitEvents(
    tx: FileLifecycleOutboxWriter,
    userId: string,
    vaultId: string,
    upserts: PublishedSyncFile[],
    deleted: DeletedSyncFile[],
    existingMap: Map<string, ExistingSyncFileState>,
  ): Promise<void> {
    const events = [
      ...upserts.map((file) => {
        const previous = existingMap.get(file.fileId);
        return {
          id: randomUUID(),
          userId,
          vaultId,
          fileId: file.fileId,
          eventType: 'file_upserted',
          payload: {
            path: file.path,
            title: file.title,
            size: file.size,
            contentHash: file.contentHash,
            storageRevision: file.storageRevision,
            vectorClock: file.vectorClock,
            previousPath: previous?.path ?? null,
          },
          createdAt: new Date(),
        };
      }),
      ...deleted.map((item) => {
        const previous = existingMap.get(item.fileId);
        return {
          id: randomUUID(),
          userId,
          vaultId,
          fileId: item.fileId,
          eventType: 'file_deleted',
          payload: {
            path: previous?.path ?? null,
            contentHash: previous?.contentHash ?? null,
            storageRevision: previous?.storageRevision ?? null,
          },
          createdAt: new Date(),
        };
      }),
    ];

    if (events.length === 0) {
      return;
    }

    await tx.fileLifecycleOutbox.createMany({
      data: events,
    });
  }

  async claimPendingBatch(
    options: ClaimPendingBatchOptions,
  ): Promise<FileLifecycleOutboxRecord[]> {
    const now = options.now ?? new Date();
    const leaseExpiresAt = new Date(now.getTime() + options.leaseMs);

    return this.prisma.$transaction(async (tx) => {
      const candidates = await tx.fileLifecycleOutbox.findMany({
        where: {
          processedAt: null,
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
        },
        orderBy: { createdAt: 'asc' },
        take: options.limit,
      });

      if (candidates.length === 0) {
        return [];
      }

      const ids = candidates.map((event) => event.id);
      await tx.fileLifecycleOutbox.updateMany({
        where: {
          id: { in: ids },
          processedAt: null,
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
        },
        data: {
          leasedBy: options.consumerId,
          leaseExpiresAt,
        },
      });

      return tx.fileLifecycleOutbox.findMany({
        where: {
          id: { in: ids },
          processedAt: null,
          leasedBy: options.consumerId,
          leaseExpiresAt,
        },
        orderBy: { createdAt: 'asc' },
      });
    });
  }

  async ackClaimedBatch(
    consumerId: string,
    ids: string[],
    now: Date = new Date(),
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const result = await this.prisma.fileLifecycleOutbox.updateMany({
      where: {
        id: { in: ids },
        processedAt: null,
        leasedBy: consumerId,
      },
      data: {
        processedAt: now,
        leasedBy: null,
        leaseExpiresAt: null,
      },
    });

    return result.count;
  }
}
