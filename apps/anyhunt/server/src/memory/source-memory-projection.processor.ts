import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import {
  MEMOX_SOURCE_MEMORY_PROJECTION_QUEUE,
  type MemoxSourceMemoryProjectionJobData,
} from '../queue';
import { SourceMemoryProjectionService } from './source-memory-projection.service';

@Processor(MEMOX_SOURCE_MEMORY_PROJECTION_QUEUE)
export class SourceMemoryProjectionProcessor extends WorkerHost {
  private readonly logger = new Logger(SourceMemoryProjectionProcessor.name);

  constructor(
    private readonly projectionService: SourceMemoryProjectionService,
  ) {
    super();
  }

  async process(job: Job<MemoxSourceMemoryProjectionJobData>) {
    this.logger.log(
      `Processing source memory projection job: ${job.id} (${job.data.sourceId}@${job.data.revisionId})`,
    );
    return this.projectionService.processJob(job.data);
  }
}
