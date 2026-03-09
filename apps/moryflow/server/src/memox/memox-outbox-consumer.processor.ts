import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { MemoxOutboxConsumerService } from './memox-outbox-consumer.service';

export const MEMOX_OUTBOX_CONSUMER_QUEUE = 'memox-outbox-consumer-queue';

@Processor(MEMOX_OUTBOX_CONSUMER_QUEUE)
export class MemoxOutboxConsumerProcessor extends WorkerHost {
  constructor(
    private readonly memoxOutboxConsumerService: MemoxOutboxConsumerService,
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
      const result = await this.memoxOutboxConsumerService.processBatch({
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
