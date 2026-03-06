/**
 * [INPUT]: BullMQ source cleanup job（apiKeyId/sourceId）
 * [OUTPUT]: 清理对象存储并硬删除 source 事实源
 * [POS]: Sources 删除异步处理器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  MEMOX_SOURCE_CLEANUP_QUEUE,
  type MemoxSourceCleanupJobData,
} from '../queue';
import { KnowledgeSourceDeletionService } from './knowledge-source-deletion.service';

@Processor(MEMOX_SOURCE_CLEANUP_QUEUE)
export class SourceCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(SourceCleanupProcessor.name);

  constructor(
    private readonly deletionService: KnowledgeSourceDeletionService,
  ) {
    super();
  }

  async process(job: Job<MemoxSourceCleanupJobData>) {
    this.logger.log(`Processing source cleanup job: ${job.id}`);

    await this.deletionService.processCleanupJob(
      job.data.apiKeyId,
      job.data.sourceId,
    );

    return {
      sourceId: job.data.sourceId,
      status: 'COMPLETED',
    };
  }
}
