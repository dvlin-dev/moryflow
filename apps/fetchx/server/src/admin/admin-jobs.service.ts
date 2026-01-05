/**
 * Admin Jobs Service
 * 任务查询与统计
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type { JobsQuery, ErrorStatsQuery, CleanupStaleJobsQuery } from './dto';

@Injectable()
export class AdminJobsService {
  private readonly logger = new Logger(AdminJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取任务列表
   */
  async getJobs(query: JobsQuery) {
    const { page, limit, search, status, errorCode, userId, dateFrom, dateTo } =
      query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(errorCode && { errorCode }),
      ...(userId && { userId }),
      ...(search && {
        url: { contains: search, mode: 'insensitive' as const },
      }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.scrapeJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          url: true,
          status: true,
          errorCode: true,
          error: true,
          totalMs: true,
          queueWaitMs: true,
          fromCache: true,
          createdAt: true,
          completedAt: true,
          user: {
            select: { id: true, email: true },
          },
        },
      }),
      this.prisma.scrapeJob.count({ where }),
    ]);

    return {
      items: jobs.map((job) => ({
        id: job.id,
        url: job.url,
        status: job.status,
        errorCode: job.errorCode,
        error: job.error,
        totalMs: job.totalMs,
        queueWaitMs: job.queueWaitMs,
        fromCache: job.fromCache,
        userId: job.user.id,
        userEmail: job.user.email,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取任务详情
   */
  async getJob(id: string) {
    const job = await this.prisma.scrapeJob.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        apiKey: {
          select: { id: true, name: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      url: job.url,
      requestHash: job.requestHash,
      status: job.status,
      options: job.options,
      result: job.result,
      screenshot: job.screenshotUrl
        ? {
            url: job.screenshotUrl,
            width: job.screenshotWidth,
            height: job.screenshotHeight,
            fileSize: job.screenshotFileSize,
            format: job.screenshotFormat,
            expiresAt: job.screenshotExpiresAt,
          }
        : null,
      error: job.error,
      errorCode: job.errorCode,
      timing: {
        queueWait: job.queueWaitMs,
        fetch: job.fetchMs,
        render: job.renderMs,
        transform: job.transformMs,
        screenshot: job.screenshotMs,
        imageProcess: job.imageProcessMs,
        upload: job.uploadMs,
        total: job.totalMs,
      },
      fromCache: job.fromCache,
      quotaDeducted: job.quotaDeducted,
      quotaSource: job.quotaSource,
      user: {
        id: job.user.id,
        email: job.user.email,
        name: job.user.name,
      },
      apiKey: job.apiKey
        ? {
            id: job.apiKey.id,
            name: job.apiKey.name,
          }
        : null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * 获取任务统计
   */
  async getJobStats() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const startOfHour = new Date(now);
    startOfHour.setMinutes(0, 0, 0);

    const [
      totalJobs,
      todayJobs,
      hourJobs,
      pendingJobs,
      processingJobs,
      failedToday,
      statusCounts,
    ] = await Promise.all([
      this.prisma.scrapeJob.count(),
      this.prisma.scrapeJob.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.scrapeJob.count({
        where: { createdAt: { gte: startOfHour } },
      }),
      this.prisma.scrapeJob.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.scrapeJob.count({
        where: { status: 'PROCESSING' },
      }),
      this.prisma.scrapeJob.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.scrapeJob.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    // 计算平均处理时间（最近 100 个完成的任务）
    const recentCompleted = await this.prisma.scrapeJob.findMany({
      where: { status: 'COMPLETED', totalMs: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 100,
      select: { totalMs: true },
    });

    const avgProcessingMs =
      recentCompleted.length > 0
        ? Math.round(
            recentCompleted.reduce((sum, j) => sum + (j.totalMs ?? 0), 0) /
              recentCompleted.length,
          )
        : 0;

    return {
      total: totalJobs,
      today: todayJobs,
      thisHour: hourJobs,
      pending: pendingJobs,
      processing: processingJobs,
      failedToday,
      avgProcessingMs,
      byStatus: statusCounts.reduce(
        (acc, s) => {
          acc[s.status] = s._count.id;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * 获取错误统计
   */
  async getErrorStats(query: ErrorStatsQuery) {
    const { days = 7 } = query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const [byCode, byDay, recentErrors] = await Promise.all([
      // 按错误码分组
      this.prisma.scrapeJob.groupBy({
        by: ['errorCode'],
        where: {
          status: 'FAILED',
          errorCode: { not: null },
          createdAt: { gte: startDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // 按天分组
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "ScrapeJob"
        WHERE status = 'FAILED' AND "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,

      // 最近错误
      this.prisma.scrapeJob.findMany({
        where: {
          status: 'FAILED',
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          url: true,
          errorCode: true,
          error: true,
          createdAt: true,
          user: {
            select: { id: true, email: true },
          },
        },
      }),
    ]);

    return {
      byCode: byCode.map((e) => ({
        code: e.errorCode,
        count: e._count.id,
      })),
      byDay: byDay.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      recent: recentErrors.map((e) => ({
        id: e.id,
        url: e.url,
        errorCode: e.errorCode,
        error: e.error,
        userId: e.user.id,
        userEmail: e.user.email,
        createdAt: e.createdAt,
      })),
    };
  }

  /**
   * 清理卡住的任务
   * 将超过指定时间仍处于 PROCESSING 状态的任务标记为 FAILED
   */
  async cleanupStaleJobs(query: CleanupStaleJobsQuery) {
    const { maxAgeMinutes = 30, dryRun = false } = query;
    const cutoffDate = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    // 查找卡住的任务
    const staleJobs = await this.prisma.scrapeJob.findMany({
      where: {
        status: 'PROCESSING',
        createdAt: { lt: cutoffDate },
      },
      select: {
        id: true,
        url: true,
        createdAt: true,
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (dryRun) {
      return {
        dryRun: true,
        staleJobsCount: staleJobs.length,
        staleJobs: staleJobs.map((j) => ({
          id: j.id,
          url: j.url,
          userId: j.user.id,
          userEmail: j.user.email,
          createdAt: j.createdAt,
          staleMinutes: Math.round(
            (Date.now() - j.createdAt.getTime()) / 60000,
          ),
        })),
      };
    }

    // 批量更新为 FAILED 状态
    const result = await this.prisma.scrapeJob.updateMany({
      where: {
        status: 'PROCESSING',
        createdAt: { lt: cutoffDate },
      },
      data: {
        status: 'FAILED',
        error: `Job timed out - stuck in PROCESSING for more than ${maxAgeMinutes} minutes`,
        errorCode: 'PAGE_TIMEOUT',
      },
    });

    this.logger.log(`Cleaned up ${result.count} stale jobs`);

    return {
      dryRun: false,
      cleanedCount: result.count,
      cleanedJobs: staleJobs.map((j) => ({
        id: j.id,
        url: j.url,
        userId: j.user.id,
        userEmail: j.user.email,
        createdAt: j.createdAt,
      })),
    };
  }
}
