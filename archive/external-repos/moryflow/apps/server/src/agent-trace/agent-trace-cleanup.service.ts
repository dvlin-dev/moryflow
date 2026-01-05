/**
 * Agent Trace Cleanup Service
 * 日志清理定时任务
 *
 * [PROVIDES]: 日志数据定时清理功能
 * [DEPENDS]: PrismaService
 * [POS]: 每天凌晨 3:00 执行，清理过期的 Trace/Span 数据
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AgentTraceStatus } from '../../generated/prisma/client';

// 默认保留期（天）
const DEFAULT_RETENTION_SUCCESS = 7;
const DEFAULT_RETENTION_FAILED = 30;
const BATCH_SIZE = 1000;

@Injectable()
export class AgentTraceCleanupService {
  private readonly logger = new Logger(AgentTraceCleanupService.name);

  // 保留期配置（天）
  private readonly retentionSuccess: number;
  private readonly retentionFailed: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.retentionSuccess =
      this.configService.get<number>('AGENT_TRACE_RETENTION_SUCCESS') ??
      DEFAULT_RETENTION_SUCCESS;
    this.retentionFailed =
      this.configService.get<number>('AGENT_TRACE_RETENTION_FAILED') ??
      DEFAULT_RETENTION_FAILED;

    this.logger.log(
      `Cleanup configured: success=${this.retentionSuccess}d, failed=${this.retentionFailed}d`,
    );
  }

  /**
   * 每天凌晨 3:00 执行清理
   * @returns 清理的 Trace 数量
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup(): Promise<number> {
    this.logger.log('Starting agent trace cleanup...');

    const startTime = Date.now();
    let totalDeleted = 0;

    try {
      // 清理成功的 Traces（7天）
      const successDeleted = await this.cleanupByStatus(
        [AgentTraceStatus.completed],
        this.retentionSuccess,
      );
      totalDeleted += successDeleted;

      // 清理失败/中断的 Traces（30天）
      const failedDeleted = await this.cleanupByStatus(
        [AgentTraceStatus.failed, AgentTraceStatus.interrupted],
        this.retentionFailed,
      );
      totalDeleted += failedDeleted;

      // 清理 pending 状态超过 7 天的（可能是异常数据）
      const pendingDeleted = await this.cleanupByStatus(
        [AgentTraceStatus.pending],
        this.retentionSuccess,
      );
      totalDeleted += pendingDeleted;

      const duration = Date.now() - startTime;
      this.logger.log(
        `Cleanup completed: deleted ${totalDeleted} traces in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('Cleanup failed', error);
    }

    return totalDeleted;
  }

  /**
   * 按状态批量清理
   */
  private async cleanupByStatus(
    statuses: AgentTraceStatus[],
    retentionDays: number,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    cutoffDate.setHours(0, 0, 0, 0);

    let totalDeleted = 0;
    let batchDeleted = 0;

    do {
      // 找出要删除的 Trace IDs
      const tracesToDelete = await this.prisma.agentTrace.findMany({
        where: {
          status: { in: statuses },
          startedAt: { lt: cutoffDate },
        },
        select: { traceId: true },
        take: BATCH_SIZE,
      });

      if (tracesToDelete.length === 0) {
        break;
      }

      const traceIds = tracesToDelete.map((t) => t.traceId);

      // 使用事务确保一致性：先删 Span，再删 Trace
      await this.prisma.$transaction(async (tx) => {
        // 删除关联的 Spans
        await tx.agentSpan.deleteMany({
          where: { traceId: { in: traceIds } },
        });

        // 删除 Traces
        await tx.agentTrace.deleteMany({
          where: { traceId: { in: traceIds } },
        });
      });

      batchDeleted = tracesToDelete.length;
      totalDeleted += batchDeleted;

      this.logger.debug(
        `Deleted batch of ${batchDeleted} traces (status: ${statuses.join(',')})`,
      );
    } while (batchDeleted === BATCH_SIZE);

    if (totalDeleted > 0) {
      this.logger.log(
        `Deleted ${totalDeleted} traces with status [${statuses.join(',')}] older than ${retentionDays} days`,
      );
    }

    return totalDeleted;
  }

  /**
   * 手动触发清理（供 Admin API 调用）
   */
  async triggerCleanup(): Promise<{ deletedCount: number; duration: number }> {
    const startTime = Date.now();
    const deletedCount = await this.handleCleanup();
    return {
      deletedCount,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 获取清理统计信息
   */
  async getCleanupStats(): Promise<{
    retentionSuccess: number;
    retentionFailed: number;
    pendingCleanup: {
      success: number;
      failed: number;
      pending: number;
    };
  }> {
    const successCutoff = new Date();
    successCutoff.setDate(successCutoff.getDate() - this.retentionSuccess);

    const failedCutoff = new Date();
    failedCutoff.setDate(failedCutoff.getDate() - this.retentionFailed);

    const [successCount, failedCount, pendingCount] = await Promise.all([
      this.prisma.agentTrace.count({
        where: {
          status: AgentTraceStatus.completed,
          startedAt: { lt: successCutoff },
        },
      }),
      this.prisma.agentTrace.count({
        where: {
          status: {
            in: [AgentTraceStatus.failed, AgentTraceStatus.interrupted],
          },
          startedAt: { lt: failedCutoff },
        },
      }),
      this.prisma.agentTrace.count({
        where: {
          status: AgentTraceStatus.pending,
          startedAt: { lt: successCutoff },
        },
      }),
    ]);

    return {
      retentionSuccess: this.retentionSuccess,
      retentionFailed: this.retentionFailed,
      pendingCleanup: {
        success: successCount,
        failed: failedCount,
        pending: pendingCount,
      },
    };
  }
}
