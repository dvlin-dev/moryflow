/**
 * [INPUT]: 定时任务触发 + REQUEST_LOG_RETENTION_DAYS 配置
 * [OUTPUT]: 过期 RequestLog 删除结果
 * [POS]: RequestLog 生命周期管理（默认保留 30 天）
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  REQUEST_LOG_CLEANUP_BATCH_SIZE,
  REQUEST_LOG_CLEANUP_CRON,
  REQUEST_LOG_RETENTION_DAYS,
} from './request-log.constants';
import { RequestLogService } from './request-log.service';

@Injectable()
export class RequestLogCleanupService {
  private readonly logger = new Logger(RequestLogCleanupService.name);

  constructor(private readonly requestLogService: RequestLogService) {}

  @Cron(REQUEST_LOG_CLEANUP_CRON)
  async cleanupExpiredLogs(): Promise<void> {
    const retentionDays = this.getRetentionDays();
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    let totalDeleted = 0;

    while (true) {
      const deletedCount = await this.requestLogService.deleteExpiredBatch(
        cutoff,
        REQUEST_LOG_CLEANUP_BATCH_SIZE,
      );

      totalDeleted += deletedCount;

      if (deletedCount < REQUEST_LOG_CLEANUP_BATCH_SIZE) {
        break;
      }
    }

    this.logger.log(
      `Request log cleanup completed: deleted=${totalDeleted}, retentionDays=${retentionDays}, cutoff=${cutoff.toISOString()}`,
    );
  }

  private getRetentionDays(): number {
    const raw = process.env.REQUEST_LOG_RETENTION_DAYS;
    if (!raw) {
      return REQUEST_LOG_RETENTION_DAYS;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.logger.warn(
        `Invalid REQUEST_LOG_RETENTION_DAYS=${raw}, fallback to ${REQUEST_LOG_RETENTION_DAYS}`,
      );
      return REQUEST_LOG_RETENTION_DAYS;
    }

    return parsed;
  }
}
