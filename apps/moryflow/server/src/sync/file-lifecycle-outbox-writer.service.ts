/**
 * [INPUT]: sync commit 成功后的文件事实变化
 * [OUTPUT]: file lifecycle outbox 写入记录
 * [POS]: Sync 写侧的文件生命周期事件 writer 边界
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import type {
  DeletedSyncFile,
  ExistingSyncFileState,
  FileDeletedLifecyclePayload,
  FileLifecycleOutboxWriterStore,
  FileUpsertedLifecyclePayload,
  PublishedSyncFile,
} from './file-lifecycle-outbox.types';

@Injectable()
export class FileLifecycleOutboxWriterService {
  async appendSyncCommitEvents(
    tx: FileLifecycleOutboxWriterStore,
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
            previousContentHash: previous?.contentHash ?? null,
            previousStorageRevision: previous?.storageRevision ?? null,
          } satisfies FileUpsertedLifecyclePayload,
          createdAt: new Date(),
        } satisfies Prisma.FileLifecycleOutboxCreateManyInput;
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
          } satisfies FileDeletedLifecyclePayload,
          createdAt: new Date(),
        } satisfies Prisma.FileLifecycleOutboxCreateManyInput;
      }),
    ];

    if (events.length === 0) {
      return;
    }

    await tx.fileLifecycleOutbox.createMany({
      data: events,
    });
  }
}

export type {
  DeletedSyncFile,
  ExistingSyncFileState,
  FileDeletedLifecyclePayload,
  FileLifecycleOutboxWriterStore,
  FileUpsertedLifecyclePayload,
  PublishedSyncFile,
} from './file-lifecycle-outbox.types';
