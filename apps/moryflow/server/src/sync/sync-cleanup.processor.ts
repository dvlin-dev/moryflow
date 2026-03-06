/**
 * [INPUT]: SyncCleanupJobData（userId/vaultId/fileIds）
 * [OUTPUT]: R2 删除执行结果；失败时抛错触发 BullMQ 重试
 * [POS]: Sync 删除补偿队列处理器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  SYNC_CLEANUP_QUEUE,
  type SyncCleanupJobData,
} from './sync-cleanup.service';
import { SyncStorageDeletionService } from './sync-storage-deletion.service';

@Processor(SYNC_CLEANUP_QUEUE)
export class SyncCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncCleanupProcessor.name);

  constructor(
    private readonly syncStorageDeletionService: SyncStorageDeletionService,
  ) {
    super();
  }

  async process(job: Job<SyncCleanupJobData>): Promise<void> {
    const { userId, vaultId, targets } = job.data;
    const { retryTargets } =
      await this.syncStorageDeletionService.deleteTargetsOnce(
        userId,
        vaultId,
        targets,
        'retry',
      );

    if (retryTargets.length > 0) {
      throw new Error('Failed to delete files from storage safely');
    }

    this.logger.log(
      `Completed storage cleanup for vault ${vaultId}, ${targets.length} file(s)`,
    );
  }
}
