import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { MEMOX_WORKSPACE_CONTENT_QUEUE } from './memox-source-contract';
import {
  MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT,
  MEMOX_WORKSPACE_CONTENT_CONSUMER_ID,
  MEMOX_WORKSPACE_CONTENT_LEASE_MS,
  MEMOX_WORKSPACE_CONTENT_MAX_BATCHES,
} from './memox-workspace-content.constants';

@Injectable()
export class MemoxWorkspaceContentDrainService {
  constructor(
    @InjectQueue(MEMOX_WORKSPACE_CONTENT_QUEUE)
    private readonly queue: Queue<{
      consumerId: string;
      limit: number;
      leaseMs: number;
      maxBatches: number;
    }>,
  ) {}

  @Cron('*/5 * * * * *')
  async scheduleDrain(): Promise<void> {
    await this.queue.add(
      'drain',
      {
        consumerId: MEMOX_WORKSPACE_CONTENT_CONSUMER_ID,
        limit: MEMOX_WORKSPACE_CONTENT_BATCH_LIMIT,
        leaseMs: MEMOX_WORKSPACE_CONTENT_LEASE_MS,
        maxBatches: MEMOX_WORKSPACE_CONTENT_MAX_BATCHES,
      },
      {
        removeOnComplete: true,
        removeOnFail: 50,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }
}
