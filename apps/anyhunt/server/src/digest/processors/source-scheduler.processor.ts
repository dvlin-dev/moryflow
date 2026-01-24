/**
 * Source Scheduler Processor
 *
 * [INPUT]: 定时触发（BullMQ Repeatable Job）
 * [OUTPUT]: 创建待执行的 Source Refresh Jobs
 * [POS]: BullMQ Worker - 扫描到期源并创建刷新任务（带分布式锁）
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  DIGEST_SOURCE_REFRESH_QUEUE,
  DIGEST_SOURCE_SCHEDULER_QUEUE,
  type DigestSourceRefreshJobData,
} from '../../queue/queue.constants';

@Processor(DIGEST_SOURCE_SCHEDULER_QUEUE)
export class SourceSchedulerProcessor extends WorkerHost {
  private readonly logger = new Logger(SourceSchedulerProcessor.name);
  private readonly lockKey = 'digest:scheduler:source';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue(DIGEST_SOURCE_REFRESH_QUEUE)
    private readonly refreshQueue: Queue<DigestSourceRefreshJobData>,
  ) {
    super();
  }

  async process(_job: Job): Promise<{ scheduled: number; total: number }> {
    void _job; // WorkerHost requires job parameter
    this.logger.debug('Running source scheduler scan');

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
      // 1. 查找需要刷新的源（SCHEDULED 模式，nextRefreshAt <= now）
      const sourcesToRefresh = await this.prisma.digestSource.findMany({
        where: {
          enabled: true,
          refreshMode: 'SCHEDULED',
          nextRefreshAt: { lte: new Date() },
        },
        take: 50, // 批量处理
        include: {
          subscriptionSources: {
            take: 1,
            include: { subscription: { select: { deletedAt: true } } },
          },
        },
      });

      // 过滤掉没有活跃订阅的源
      const activeSources = sourcesToRefresh.filter(
        (s) =>
          s.subscriptionSources.length > 0 &&
          !s.subscriptionSources[0].subscription.deletedAt,
      );

      this.logger.log(`Found ${activeSources.length} sources to refresh`);

      let scheduled = 0;

      for (const source of activeSources) {
        try {
          // 2. 确定源类型
          let sourceType: 'RSS' | 'WEBPAGE' | 'API';
          switch (source.type) {
            case 'rss':
              sourceType = 'RSS';
              break;
            case 'siteCrawl':
              sourceType = 'WEBPAGE';
              break;
            default:
              sourceType = 'API';
          }

          // 3. 创建刷新任务
          await this.refreshQueue.add(
            'refresh',
            {
              sourceId: source.id,
              url: this.extractUrlFromConfig(source.config, source.type),
              sourceType,
            },
            {
              jobId: `source-refresh-${source.id}-${Date.now()}`,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 10000, // 10 秒初始延迟
              },
            },
          );

          scheduled++;

          this.logger.debug(`Scheduled refresh for source ${source.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to schedule refresh for source ${source.id}:`,
            error,
          );
        }
      }

      this.logger.log(`Scheduled ${scheduled} source refreshes`);

      return { scheduled, total: activeSources.length };
    } catch (error) {
      this.logger.error('Source scheduler failed:', error);
      throw error;
    } finally {
      await this.redis.del(this.lockKey);
    }
  }

  /**
   * 从配置中提取 URL
   */
  private extractUrlFromConfig(config: unknown, type: string): string {
    const cfg = config as Record<string, unknown>;
    switch (type) {
      case 'rss':
        return (cfg.feedUrl as string) || '';
      case 'siteCrawl':
        return (cfg.siteUrl as string) || '';
      default:
        return (cfg.url as string) || '';
    }
  }
}
