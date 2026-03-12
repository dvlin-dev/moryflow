/**
 * [INPUT]: Expired pending-upload revisions
 * [OUTPUT]: Enqueued or completed zombie revision cleanup
 * [POS]: Sources 过期 revision 维护服务
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import {
  MEMOX_SOURCE_REVISION_CLEANUP_QUEUE,
  type MemoxSourceRevisionCleanupJobData,
} from '../queue';
import { buildBullJobId } from '../queue/queue.utils';
import { KnowledgeSourceRevisionRepository } from './knowledge-source-revision.repository';
import { SourceStorageService } from './source-storage.service';

const EXPIRED_SOURCE_REVISION_CLEANUP_CRON = '0 0 * * * *';
const EXPIRED_SOURCE_REVISION_BATCH_SIZE = 100;

@Injectable()
export class SourceRevisionCleanupService {
  constructor(
    private readonly revisionRepository: KnowledgeSourceRevisionRepository,
    private readonly storageService: SourceStorageService,
    @InjectQueue(MEMOX_SOURCE_REVISION_CLEANUP_QUEUE)
    private readonly cleanupQueue: Queue<MemoxSourceRevisionCleanupJobData>,
  ) {}

  @Cron(EXPIRED_SOURCE_REVISION_CLEANUP_CRON)
  async enqueueExpiredPendingUploads(): Promise<void> {
    const revisions = await this.revisionRepository.listExpiredPendingUploads(
      new Date(),
      EXPIRED_SOURCE_REVISION_BATCH_SIZE,
    );

    await Promise.all(
      revisions.map((revision) =>
        this.cleanupQueue.add(
          'cleanup-expired-source-revision',
          {
            apiKeyId: revision.apiKeyId,
            revisionId: revision.id,
          },
          {
            jobId: buildBullJobId(
              'memox',
              'source-revision-cleanup',
              revision.id,
            ),
          },
        ),
      ),
    );
  }

  async processExpiredPendingUpload(revisionId: string): Promise<void> {
    const revision = await this.revisionRepository.findAnyById(revisionId);
    if (!revision || revision.status !== 'PENDING_UPLOAD') {
      return;
    }
    if (
      !revision.pendingUploadExpiresAt ||
      revision.pendingUploadExpiresAt.getTime() > Date.now()
    ) {
      return;
    }

    const keys = [revision.blobR2Key, revision.normalizedTextR2Key].filter(
      (value): value is string => Boolean(value),
    );
    if (keys.length > 0) {
      await this.storageService.deleteObjects(keys);
    }
    await this.revisionRepository.deleteById(revision.apiKeyId, revision.id);
  }
}
