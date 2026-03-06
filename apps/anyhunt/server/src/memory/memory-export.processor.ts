/**
 * [INPUT]: BullMQ 导出任务（memoryExportId/apiKeyId/filters）
 * [OUTPUT]: 更新 MemoryExport 状态并写入 R2 导出文件
 * [POS]: Memox Memory 导出异步处理器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  MEMOX_MEMORY_EXPORT_QUEUE,
  type MemoxMemoryExportJobData,
} from '../queue/queue.constants';
import { MemoryService } from './memory.service';

@Processor(MEMOX_MEMORY_EXPORT_QUEUE)
export class MemoryExportProcessor extends WorkerHost {
  private readonly logger = new Logger(MemoryExportProcessor.name);

  constructor(private readonly memoryService: MemoryService) {
    super();
  }

  async process(job: Job<MemoxMemoryExportJobData>) {
    this.logger.log(`Processing memory export job: ${job.id}`);

    await this.memoryService.processExportJob({
      memoryExportId: job.data.memoryExportId,
      apiKeyId: job.data.apiKeyId,
      filters: job.data.filters,
      orgId: job.data.orgId ?? null,
      projectId: job.data.projectId ?? null,
    });

    return {
      memoryExportId: job.data.memoryExportId,
      status: 'COMPLETED',
    };
  }
}
