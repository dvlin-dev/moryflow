/**
 * [INPUT]: BullMQ api key cleanup job（taskId/apiKeyId）
 * [OUTPUT]: 异步清理 Memox 租户数据
 * [POS]: API Key 删除后 durable cleanup 处理器
 *
 * [PROTOCOL]: When this file changes, update this header and src/api-key/CLAUDE.md
 */

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  MEMOX_API_KEY_CLEANUP_QUEUE,
  type MemoxApiKeyCleanupJobData,
} from '../queue';
import { ApiKeyCleanupService } from './api-key-cleanup.service';

@Processor(MEMOX_API_KEY_CLEANUP_QUEUE)
export class ApiKeyCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(ApiKeyCleanupProcessor.name);

  constructor(private readonly cleanupService: ApiKeyCleanupService) {
    super();
  }

  async process(job: Job<MemoxApiKeyCleanupJobData>) {
    this.logger.log(`Processing api key cleanup job: ${job.id}`);
    await this.cleanupService.processTask(job.data.taskId, job.data.apiKeyId);
    return {
      taskId: job.data.taskId,
      status: 'COMPLETED',
    };
  }
}
