/**
 * Subscription Scheduler Processor
 *
 * [INPUT]: 定时触发（BullMQ Repeatable Job）
 * [OUTPUT]: 创建待执行的 Subscription Run Jobs
 * [POS]: BullMQ Worker - 扫描到期订阅并创建运行任务（带分布式锁）
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { DigestSubscriptionService } from '../services/subscription.service';
import { DigestRunService } from '../services/run.service';
import {
  DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE,
  DIGEST_SUBSCRIPTION_RUN_QUEUE,
  type DigestSubscriptionRunJobData,
} from '../../queue/queue.constants';
import { getNextRunTime } from '../utils/cron.utils';

@Processor(DIGEST_SUBSCRIPTION_SCHEDULER_QUEUE)
export class SubscriptionSchedulerProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionSchedulerProcessor.name);
  private readonly lockKey = 'digest:scheduler:subscription';

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: DigestSubscriptionService,
    private readonly runService: DigestRunService,
    private readonly redis: RedisService,
    @InjectQueue(DIGEST_SUBSCRIPTION_RUN_QUEUE)
    private readonly runQueue: Queue<DigestSubscriptionRunJobData>,
  ) {
    super();
  }

  async process(_job: Job): Promise<{ scheduled: number; total: number }> {
    void _job; // WorkerHost requires job parameter
    this.logger.debug('Running subscription scheduler scan');

    const lockAcquired = await this.redis.setnx(
      this.lockKey,
      String(_job.id ?? 'scheduler'),
      120,
    );
    if (!lockAcquired) {
      this.logger.debug('Scheduler lock not acquired, skipping');
      return { scheduled: 0, total: 0 };
    }

    try {
      // 1. 查找需要运行的订阅
      const subscriptions =
        await this.subscriptionService.findSubscriptionsToSchedule();

      this.logger.log(
        `Found ${subscriptions.length} subscriptions to schedule`,
      );

      let scheduled = 0;

      for (const subscription of subscriptions) {
        try {
          // 2. 获取用户偏好设置（语言模式）
          const user = await this.prisma.user.findUnique({
            where: { id: subscription.userId },
            select: {
              userPreference: { select: { uiLocale: true } },
            },
          });

          // 3. 确定输出语言（默认 'en'）
          let outputLocale = subscription.outputLocale || 'en';
          if (
            subscription.languageMode === 'FOLLOW_UI' &&
            user?.userPreference?.uiLocale
          ) {
            outputLocale = user.userPreference.uiLocale;
          }

          // 4. 创建运行记录
          const run = await this.runService.createRun(
            subscription.id,
            subscription.userId,
            new Date(),
            'SCHEDULED',
            outputLocale,
          );

          // 5. 创建运行任务
          await this.runQueue.add(
            'run',
            {
              subscriptionId: subscription.id,
              runId: run.id,
              userId: subscription.userId,
              outputLocale,
              source: 'SCHEDULED',
            },
            {
              jobId: `sub-run-${run.id}`,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
            },
          );

          // 6. 计算并更新下次运行时间
          const nextRunAt = getNextRunTime(
            subscription.cron,
            subscription.timezone,
            new Date(),
          );

          await this.subscriptionService.updateNextRunAt(
            subscription.id,
            nextRunAt,
          );

          scheduled++;

          this.logger.debug(
            `Scheduled run ${run.id} for subscription ${subscription.id}, next at ${nextRunAt.toISOString()}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to schedule subscription ${subscription.id}:`,
            error,
          );
        }
      }

      this.logger.log(`Scheduled ${scheduled} subscription runs`);

      return { scheduled, total: subscriptions.length };
    } catch (error) {
      this.logger.error('Subscription scheduler failed:', error);
      throw error;
    } finally {
      await this.redis.del(this.lockKey);
    }
  }
}
