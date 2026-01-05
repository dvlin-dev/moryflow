/**
 * Admin Agent Trace Service
 * 管理员 Agent 追踪服务 - 可查看所有用户数据
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  GetAdminTracesQueryDto,
  GetAdminFailedToolsQueryDto,
  GetAdminStatsQueryDto,
} from './admin-agent-trace.dto';
import { AgentSpanStatus } from '../../../generated/prisma/client';

@Injectable()
export class AdminAgentTraceService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 统计接口
  // ==========================================

  /**
   * 获取统计概览
   */
  async getStats(query: GetAdminStatsQueryDto) {
    const { days } = query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // 当前周期统计
    const [currentStats, previousStats, dailyStats, toolDistribution] =
      await Promise.all([
        this.getStatsSummary(startDate, new Date()),
        this.getStatsSummary(previousStartDate, startDate),
        this.getDailyStats(startDate, days),
        this.getToolDistribution(startDate),
      ]);

    // 计算趋势
    const trends = {
      totalRuns: this.calculateTrend(
        currentStats.totalRuns,
        previousStats.totalRuns,
      ),
      successRate: this.calculateTrend(
        currentStats.successRate,
        previousStats.successRate,
      ),
      failedToolCount: this.calculateTrend(
        currentStats.failedToolCount,
        previousStats.failedToolCount,
      ),
      avgDuration: this.calculateTrend(
        currentStats.avgDuration,
        previousStats.avgDuration,
      ),
    };

    return {
      ...currentStats,
      trends,
      dailyStats,
      toolDistribution,
    };
  }

  private async getStatsSummary(startDate: Date, endDate: Date) {
    const [traceStats, completedCount, failedToolCount] = await Promise.all([
      this.prisma.agentTrace.aggregate({
        where: {
          startedAt: { gte: startDate, lt: endDate },
        },
        _count: true,
        _avg: { duration: true },
      }),
      this.prisma.agentTrace.count({
        where: {
          startedAt: { gte: startDate, lt: endDate },
          status: 'completed',
        },
      }),
      this.prisma.agentSpan.count({
        where: {
          type: 'function',
          status: AgentSpanStatus.failed,
          startedAt: { gte: startDate, lt: endDate },
        },
      }),
    ]);

    const totalRuns = traceStats._count;
    const successRate = totalRuns > 0 ? (completedCount / totalRuns) * 100 : 0;
    const avgDuration = traceStats._avg.duration ?? 0;

    return {
      totalRuns,
      successRate: Math.round(successRate * 10) / 10,
      failedToolCount,
      avgDuration: Math.round(avgDuration),
    };
  }

  private async getDailyStats(startDate: Date, days: number) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    // 使用单个 SQL 查询获取所有天的统计，避免 N+1 问题
    const stats = await this.prisma.$queryRaw<
      Array<{
        date: Date;
        success_count: bigint;
        failed_count: bigint;
      }>
    >`
      SELECT
        DATE("startedAt") as date,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
      FROM "AgentTrace"
      WHERE "startedAt" >= ${startDate}
        AND "startedAt" < ${endDate}
      GROUP BY DATE("startedAt")
      ORDER BY date ASC
    `;

    // 构建日期映射
    const statsMap = new Map<
      string,
      { successCount: number; failedCount: number }
    >();
    for (const row of stats) {
      const dateStr = row.date.toISOString().split('T')[0];
      statsMap.set(dateStr, {
        successCount: Number(row.success_count),
        failedCount: Number(row.failed_count),
      });
    }

    // 填充所有日期（包括没有数据的日期）
    const results: Array<{
      date: string;
      successCount: number;
      failedCount: number;
    }> = [];

    for (let i = 0; i < days; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const dayStat = statsMap.get(dateStr);

      results.push({
        date: dateStr,
        successCount: dayStat?.successCount ?? 0,
        failedCount: dayStat?.failedCount ?? 0,
      });
    }

    return results;
  }

  private async getToolDistribution(startDate: Date) {
    const stats = await this.prisma.$queryRaw<
      Array<{ name: string; count: bigint }>
    >`
      SELECT name, COUNT(*) as count
      FROM "AgentSpan"
      WHERE type = 'function'
        AND "startedAt" >= ${startDate}
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10
    `;

    const totalCount = stats.reduce((sum, row) => sum + Number(row.count), 0);

    return stats.map((row) => ({
      name: row.name,
      count: Number(row.count),
      percentage:
        totalCount > 0
          ? Math.round((Number(row.count) / totalCount) * 1000) / 10
          : 0,
    }));
  }

  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  // ==========================================
  // 列表接口
  // ==========================================

  /**
   * 获取 Traces 列表（所有用户）
   */
  async getTraces(query: GetAdminTracesQueryDto) {
    const { status, agentName, userId, startDate, endDate, limit, offset } =
      query;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (agentName) {
      where.agentName = { contains: agentName, mode: 'insensitive' };
    }
    if (userId) {
      where.userId = userId;
    }
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) {
        (where.startedAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.startedAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [traces, total] = await Promise.all([
      this.prisma.agentTrace.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          _count: {
            select: { spans: true },
          },
        },
      }),
      this.prisma.agentTrace.count({ where }),
    ]);

    return {
      traces,
      pagination: { total, limit, offset },
    };
  }

  /**
   * 获取单个 Trace 详情（包含所有 Spans）
   */
  async getTraceDetail(traceId: string) {
    return this.prisma.agentTrace.findUnique({
      where: { traceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        spans: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });
  }

  /**
   * 获取失败的 Tool 调用列表（所有用户）
   */
  async getFailedTools(query: GetAdminFailedToolsQueryDto) {
    const {
      toolName,
      agentName,
      errorType,
      userId,
      startDate,
      endDate,
      limit,
      offset,
    } = query;

    const where: Record<string, unknown> = {
      type: 'function',
      status: AgentSpanStatus.failed,
    };

    if (toolName) {
      where.name = { contains: toolName, mode: 'insensitive' };
    }
    if (errorType) {
      where.errorType = { contains: errorType, mode: 'insensitive' };
    }

    // 通过 trace 过滤 agentName 和 userId
    const traceFilter: Record<string, unknown> = {};
    if (agentName) {
      traceFilter.agentName = { contains: agentName, mode: 'insensitive' };
    }
    if (userId) {
      traceFilter.userId = userId;
    }
    if (Object.keys(traceFilter).length > 0) {
      where.trace = traceFilter;
    }

    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) {
        (where.startedAt as Record<string, Date>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.startedAt as Record<string, Date>).lte = new Date(endDate);
      }
    }

    const [spans, total] = await Promise.all([
      this.prisma.agentSpan.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          trace: {
            select: {
              agentName: true,
              groupId: true,
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.agentSpan.count({ where }),
    ]);

    return {
      spans,
      pagination: { total, limit, offset },
    };
  }

  // ==========================================
  // Tool 和 Agent 统计
  // ==========================================

  /**
   * 获取 Tool 统计信息
   */
  async getToolStats(query: GetAdminStatsQueryDto) {
    const { days } = query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.$queryRaw<
      Array<{
        name: string;
        total_calls: bigint;
        success_count: bigint;
        failed_count: bigint;
        avg_duration: number;
      }>
    >`
      SELECT
        name,
        COUNT(*) as total_calls,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        AVG(duration) as avg_duration
      FROM "AgentSpan"
      WHERE type = 'function'
        AND "startedAt" >= ${startDate}
      GROUP BY name
      ORDER BY total_calls DESC
    `;

    return stats.map((row) => ({
      name: row.name,
      totalCalls: Number(row.total_calls),
      successCount: Number(row.success_count),
      failedCount: Number(row.failed_count),
      successRate:
        Number(row.total_calls) > 0
          ? Math.round(
              (Number(row.success_count) / Number(row.total_calls)) * 1000,
            ) / 10
          : 0,
      avgDuration: row.avg_duration ? Math.round(row.avg_duration) : null,
    }));
  }

  /**
   * 获取 Agent 统计信息
   */
  async getAgentStats(query: GetAdminStatsQueryDto) {
    const { days } = query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.prisma.$queryRaw<
      Array<{
        agent_name: string;
        total_runs: bigint;
        completed_count: bigint;
        failed_count: bigint;
        avg_duration: number;
        avg_turns: number;
        total_tokens: bigint;
      }>
    >`
      SELECT
        "agentName" as agent_name,
        COUNT(*) as total_runs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        AVG(duration) as avg_duration,
        AVG("turnCount") as avg_turns,
        SUM("totalTokens") as total_tokens
      FROM "AgentTrace"
      WHERE "startedAt" >= ${startDate}
      GROUP BY "agentName"
      ORDER BY total_runs DESC
    `;

    return stats.map((row) => ({
      agentName: row.agent_name,
      totalRuns: Number(row.total_runs),
      completedCount: Number(row.completed_count),
      failedCount: Number(row.failed_count),
      successRate:
        Number(row.total_runs) > 0
          ? Math.round(
              (Number(row.completed_count) / Number(row.total_runs)) * 1000,
            ) / 10
          : 0,
      avgDuration: row.avg_duration ? Math.round(row.avg_duration) : null,
      avgTurns: row.avg_turns ? Math.round(row.avg_turns * 10) / 10 : null,
      totalTokens: Number(row.total_tokens),
    }));
  }

  // ==========================================
  // 存储统计
  // ==========================================

  /**
   * 获取存储统计信息
   */
  async getStorageStats() {
    const [traceCount, spanCount, oldestTrace, newestTrace, statusCounts] =
      await Promise.all([
        this.prisma.agentTrace.count(),
        this.prisma.agentSpan.count(),
        this.prisma.agentTrace.findFirst({
          orderBy: { startedAt: 'asc' },
          select: { startedAt: true },
        }),
        this.prisma.agentTrace.findFirst({
          orderBy: { startedAt: 'desc' },
          select: { startedAt: true },
        }),
        this.prisma.agentTrace.groupBy({
          by: ['status'],
          _count: true,
        }),
      ]);

    // 转换状态统计
    const countByStatus: Record<string, number> = {};
    for (const item of statusCounts) {
      countByStatus[item.status] = item._count;
    }

    // 估算存储大小（假设每条 Trace 约 1KB，每条 Span 约 0.5KB）
    const estimatedSizeMB =
      Math.round(((traceCount * 1 + spanCount * 0.5) / 1024) * 10) / 10;

    return {
      traceCount,
      spanCount,
      oldestDate: oldestTrace?.startedAt ?? null,
      newestDate: newestTrace?.startedAt ?? null,
      countByStatus,
      estimatedSizeMB,
    };
  }
}
