import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { MEMOX_WORKSPACE_CONTENT_QUEUE } from './memox-source-contract';
import { MemoxWorkspaceContentConsumerService } from './memox-workspace-content-consumer.service';

@Processor(MEMOX_WORKSPACE_CONTENT_QUEUE)
export class MemoxWorkspaceContentConsumerProcessor extends WorkerHost {
  constructor(
    private readonly consumerService: MemoxWorkspaceContentConsumerService,
  ) {
    super();
  }

  async process(
    job: Job<{
      consumerId: string;
      limit: number;
      leaseMs: number;
      maxBatches?: number;
    }>,
  ): Promise<void> {
    const maxBatches = Math.max(1, job.data.maxBatches ?? 1);

    for (let batch = 0; batch < maxBatches; batch += 1) {
      const result = await this.consumerService.processBatch({
        consumerId: job.data.consumerId,
        limit: job.data.limit,
        leaseMs: job.data.leaseMs,
      });
      if (result.claimed < job.data.limit) {
        break;
      }
    }
  }
}
