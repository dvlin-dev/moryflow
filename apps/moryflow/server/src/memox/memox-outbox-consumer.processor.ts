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
    }>,
  ): Promise<void> {
    await this.memoxOutboxConsumerService.processBatch(job.data);
  }
}
