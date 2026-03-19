/**
 * [INPUT]: ReindexMaintenanceJobData from Bull queue
 * [OUTPUT]: Reindexed sources with updated chunks and embeddings
 * [POS]: Maintenance processor for bulk reindex after chunking parameter changes
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  MEMOX_REINDEX_MAINTENANCE_QUEUE,
  type MemoxReindexMaintenanceJobData,
} from '../queue/queue.constants';
import { ReindexMaintenanceService } from './reindex-maintenance.service';

@Processor(MEMOX_REINDEX_MAINTENANCE_QUEUE)
export class ReindexMaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(ReindexMaintenanceProcessor.name);

  constructor(
    private readonly reindexService: ReindexMaintenanceService,
  ) {
    super();
  }

  async process(
    job: Job<MemoxReindexMaintenanceJobData>,
  ): Promise<MemoxReindexMaintenanceJobData> {
    this.logger.log(
      `Starting reindex maintenance batch: jobId=${job.data.jobId} cursor=${job.data.cursor ?? 'START'}`,
    );

    const result = await this.reindexService.processBatch(job.data);

    this.logger.log(
      `Reindex maintenance batch complete: processed=${result.processedCount} failed=${result.failedCount} skipped=${result.skippedCount}`,
    );

    return result;
  }
}
