/**
 * [INPUT]: userId + vaultId + 已删除 fileIds
 * [OUTPUT]: 持久化补偿删除任务入队结果
 * [POS]: Sync 删除补偿队列入口，确保 R2 删除失败后可重试
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import type { SyncStorageDeletionTarget } from './sync-storage-deletion.service';

export const SYNC_CLEANUP_QUEUE = 'sync-cleanup-queue';
const LEGACY_STORAGE_DELETE_DELAY_MS = 60_000;

export interface SyncCleanupJobData {
  userId: string;
  vaultId: string;
  targets: SyncStorageDeletionTarget[];
}

@Injectable()
export class SyncCleanupService {
  private readonly logger = new Logger(SyncCleanupService.name);

  constructor(
    @InjectQueue(SYNC_CLEANUP_QUEUE)
    private readonly cleanupQueue: Queue<SyncCleanupJobData>,
  ) {}

  async enqueueStorageDeletionRetry(
    userId: string,
    vaultId: string,
    targets: SyncStorageDeletionTarget[],
  ): Promise<void> {
    if (targets.length === 0) return;

    const revisionedTargets = targets.filter((target) =>
      Boolean(target.expectedStorageRevision),
    );
    const legacyTargets = targets.filter(
      (target) => !target.expectedStorageRevision,
    );

    if (revisionedTargets.length > 0) {
      await this.addCleanupJob(userId, vaultId, revisionedTargets);
    }

    if (legacyTargets.length > 0) {
      await this.addCleanupJob(
        userId,
        vaultId,
        legacyTargets,
        LEGACY_STORAGE_DELETE_DELAY_MS,
      );
    }

    this.logger.warn(
      `Enqueued storage cleanup retry for vault ${vaultId}, ${targets.length} file(s)`,
    );
  }

  private async addCleanupJob(
    userId: string,
    vaultId: string,
    targets: SyncStorageDeletionTarget[],
    delay = 0,
  ): Promise<void> {
    await this.cleanupQueue.add(
      'delete-storage-files',
      {
        userId,
        vaultId,
        targets,
      },
      {
        jobId: `sync-cleanup:${userId}:${vaultId}:${randomUUID()}`,
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 8,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        delay,
      },
    );
  }
}
