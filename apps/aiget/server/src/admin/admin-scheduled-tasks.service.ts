/**
 * Admin Scheduled Tasks Service
 * 定时任务：清理卡住的任务
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma';

/** 默认超时时间：30分钟 */
const DEFAULT_STALE_THRESHOLD_MINUTES = 30;

@Injectable()
export class AdminScheduledTasksService implements OnModuleInit {
  private readonly logger = new Logger(AdminScheduledTasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 服务启动时清理卡住的任务
   */
  async onModuleInit() {
    this.logger.log('Running startup cleanup for stale jobs...');
    await this.cleanupStaleJobs('startup');
  }

  /**
   * 每 30 分钟执行一次清理
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleScheduledCleanup() {
    this.logger.debug('Running scheduled cleanup for stale jobs...');
    await this.cleanupStaleJobs('scheduled');
  }

  /**
   * 清理卡住的任务
   * 只清理超过 30 分钟仍处于 PROCESSING 状态的任务
   */
  private async cleanupStaleJobs(source: 'startup' | 'scheduled') {
    const cutoffDate = new Date(
      Date.now() - DEFAULT_STALE_THRESHOLD_MINUTES * 60 * 1000,
    );

    try {
      // 查找卡住的任务数量
      const staleCount = await this.prisma.scrapeJob.count({
        where: {
          status: 'PROCESSING',
          createdAt: { lt: cutoffDate },
        },
      });

      if (staleCount === 0) {
        this.logger.debug(`[${source}] No stale jobs found`);
        return;
      }

      // 批量更新为 FAILED 状态
      const result = await this.prisma.scrapeJob.updateMany({
        where: {
          status: 'PROCESSING',
          createdAt: { lt: cutoffDate },
        },
        data: {
          status: 'FAILED',
          error: `Job timed out - stuck in PROCESSING for more than ${DEFAULT_STALE_THRESHOLD_MINUTES} minutes (auto-cleanup: ${source})`,
          errorCode: 'PAGE_TIMEOUT',
        },
      });

      this.logger.log(
        `[${source}] Cleaned up ${result.count} stale jobs (threshold: ${DEFAULT_STALE_THRESHOLD_MINUTES} minutes)`,
      );
    } catch (error) {
      this.logger.error(`[${source}] Failed to cleanup stale jobs:`, error);
    }
  }
}
