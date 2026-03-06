/**
 * [INPUT]: BullMQ expired source revision cleanup job
 * [OUTPUT]: 删除过期 pending-upload revision 及其对象存储残留
 * [POS]: Sources 过期 revision cleanup 处理器
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  MEMOX_SOURCE_REVISION_CLEANUP_QUEUE,
  type MemoxSourceRevisionCleanupJobData,
} from '../queue';
import { SourceRevisionCleanupService } from './source-revision-cleanup.service';

@Processor(MEMOX_SOURCE_REVISION_CLEANUP_QUEUE)
export class SourceRevisionCleanupProcessor extends WorkerHost {
  constructor(private readonly cleanupService: SourceRevisionCleanupService) {
    super();
  }

  async process(job: Job<MemoxSourceRevisionCleanupJobData>) {
    await this.cleanupService.processExpiredPendingUpload(job.data.revisionId);
    return {
      revisionId: job.data.revisionId,
      status: 'COMPLETED',
    };
  }
}
