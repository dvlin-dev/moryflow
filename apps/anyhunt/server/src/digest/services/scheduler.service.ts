/**
 * [INPUT]: Scheduler queues for subscriptions/sources
 * [OUTPUT]: Repeatable jobs seeded on startup
 * [POS]: Digest scheduler bootstrap, ensures periodic scans exist
 *
 * [PROTOCOL]: When this file changes, update this header and src/digest/CLAUDE.md
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE,
  DIGEST_SOURCE_SCHEDULER_QUEUE,
} from '../../queue/queue.constants';

const SCHEDULER_INTERVAL_MS = 60_000;

@Injectable()
export class DigestSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(DigestSchedulerService.name);

  constructor(
    @InjectQueue(DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE)
    private readonly subscriptionSchedulerQueue: Queue,
    @InjectQueue(DIGEST_SOURCE_SCHEDULER_QUEUE)
    private readonly sourceSchedulerQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.ensureRepeatableJob(
        this.subscriptionSchedulerQueue,
        'schedule',
        'digest-subscription-scheduler',
      ),
      this.ensureRepeatableJob(
        this.sourceSchedulerQueue,
        'schedule',
        'digest-source-scheduler',
      ),
    ]);
  }

  private async ensureRepeatableJob(
    queue: Queue,
    name: string,
    jobId: string,
  ): Promise<void> {
    try {
      await queue.add(
        name,
        {},
        {
          jobId,
          repeat: { every: SCHEDULER_INTERVAL_MS },
        },
      );
      this.logger.log(`Scheduler job ensured: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to ensure scheduler job: ${jobId}`, error);
    }
  }
}
