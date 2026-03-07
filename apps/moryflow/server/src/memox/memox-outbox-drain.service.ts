/**
 * [INPUT]: 固定 drain 调度参数
 * [OUTPUT]: 周期性 outbox drain 队列任务
 * [POS]: Memox source lifecycle bridge 的调度入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron } from '@nestjs/schedule';
import type { Queue } from 'bullmq';
import { MEMOX_OUTBOX_CONSUMER_QUEUE } from './memox-outbox-consumer.processor';

const MEMOX_OUTBOX_DRAIN_JOB_ID = 'memox-outbox-drain';
const MEMOX_OUTBOX_CONSUMER_ID = 'memox-outbox-consumer';
const MEMOX_OUTBOX_BATCH_LIMIT = 20;
const MEMOX_OUTBOX_LEASE_MS = 60_000;

@Injectable()
export class MemoxOutboxDrainService {
  constructor(
    @InjectQueue(MEMOX_OUTBOX_CONSUMER_QUEUE)
    private readonly outboxQueue: Queue<{
      consumerId: string;
      limit: number;
      leaseMs: number;
    }>,
  ) {}

  @Cron('*/5 * * * * *')
  async scheduleDrain(): Promise<void> {
    await this.outboxQueue.add(
      'drain',
      {
        consumerId: MEMOX_OUTBOX_CONSUMER_ID,
        limit: MEMOX_OUTBOX_BATCH_LIMIT,
        leaseMs: MEMOX_OUTBOX_LEASE_MS,
      },
      {
        jobId: MEMOX_OUTBOX_DRAIN_JOB_ID,
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
