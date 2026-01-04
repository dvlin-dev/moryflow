/**
 * Agent Trace Service
 * Agent 执行日志服务
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  TracePayloadDto,
  GetTracesQueryDto,
  GetFailedToolsQueryDto,
  GetToolStatsQueryDto,
} from './dto/agent-trace.dto';
import {
  AgentTraceStatus,
  AgentSpanStatus,
} from '../../generated/prisma/client';

@Injectable()
export class AgentTraceService {
  private readonly logger = new Logger(AgentTraceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 上报接口
  // ==========================================

  /**
   * 保存 Agent Traces
   */
  async saveTraces(userId: string, traces: TracePayloadDto[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const trace of traces) {
          // 创建 Trace
          await tx.agentTrace.create({
            data: {
              userId,
              traceId: trace.traceId,
              groupId: trace.groupId,
              agentName: trace.agentName,
              agentType: trace.agentType,
              status: this.mapTraceStatus(trace.status),
              turnCount: trace.turnCount ?? 0,
              totalTokens: trace.totalTokens ?? 0,
              duration: trace.duration,
              errorType: trace.errorType,
              errorMessage: trace.errorMessage,
              metadata: trace.metadata as object | undefined,
              startedAt: new Date(trace.startedAt),
              completedAt: trace.completedAt
                ? new Date(trace.completedAt)
                : null,
            },
          });

          // 批量创建 Spans
          if (trace.spans.length > 0) {
            await tx.agentSpan.createMany({
              data: trace.spans.map((span) => ({
                traceId: trace.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId,
                type: span.type,
                name: span.name,
                status: this.mapSpanStatus(span.status),
                input: span.input as object | undefined,
                output: span.output as object | undefined,
                errorType: span.errorType,
                errorMessage: span.errorMessage,
                errorStack: span.errorStack,
                duration: span.duration,
                tokens: span.tokens,
                startedAt: new Date(span.startedAt),
                endedAt: span.endedAt ? new Date(span.endedAt) : null,
              })),
            });
          }
        }
      });

      this.logger.log(`Saved ${traces.length} agent traces for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to save agent traces', error);
      throw error;
    }
  }

  // ==========================================
  // 查询接口
  // ==========================================

  /**
   * 获取用户的 Agent Traces
   */
  async getTraces(userId: string, query: GetTracesQueryDto) {
    const {
      status,
      agentName,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
    } = query;

    const where: Record<string, unknown> = { userId };

    if (status) {
      where.status = status;
    }
    if (agentName) {
      where.agentName = { contains: agentName };
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
          _count: {
            select: { spans: true },
          },
        },
      }),
      this.prisma.agentTrace.count({ where }),
    ]);

    return {
      traces,
      total,
      limit,
      offset,
    };
  }

  /**
   * 获取单个 Trace 的详情（包含所有 Spans）
   */
  async getTraceDetail(userId: string, traceId: string) {
    const trace = await this.prisma.agentTrace.findFirst({
      where: { userId, traceId },
      include: {
        spans: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    return trace;
  }

  /**
   * 获取失败的 Tool 调用列表
   */
  async getFailedTools(userId: string, query: GetFailedToolsQueryDto) {
    const { toolName, startDate, endDate, limit = 50, offset = 0 } = query;

    const where: Record<string, unknown> = {
      trace: { userId },
      type: 'function',
      status: AgentSpanStatus.failed,
    };

    if (toolName) {
      where.name = { contains: toolName };
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
            },
          },
        },
      }),
      this.prisma.agentSpan.count({ where }),
    ]);

    return {
      spans,
      total,
      limit,
      offset,
    };
  }

  /**
   * 获取 Tool 统计信息
   */
  async getToolStats(userId: string, query: GetToolStatsQueryDto) {
    const { days = 7 } = query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 使用原始 SQL 进行聚合查询
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
        s.name,
        COUNT(*) as total_calls,
        SUM(CASE WHEN s.status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        AVG(s.duration) as avg_duration
      FROM "AgentSpan" s
      JOIN "AgentTrace" t ON s."traceId" = t."traceId"
      WHERE t."userId" = ${userId}
        AND s.type = 'function'
        AND s."startedAt" >= ${startDate}
      GROUP BY s.name
      ORDER BY total_calls DESC
    `;

    return stats.map((row) => ({
      name: row.name,
      totalCalls: Number(row.total_calls),
      successCount: Number(row.success_count),
      failedCount: Number(row.failed_count),
      successRate:
        Number(row.total_calls) > 0
          ? (Number(row.success_count) / Number(row.total_calls)) * 100
          : 0,
      avgDuration: row.avg_duration ? Math.round(row.avg_duration) : null,
    }));
  }

  /**
   * 获取 Agent 统计信息
   */
  async getAgentStats(userId: string, query: GetToolStatsQueryDto) {
    const { days = 30 } = query;
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
      WHERE "userId" = ${userId}
        AND "startedAt" >= ${startDate}
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
          ? (Number(row.completed_count) / Number(row.total_runs)) * 100
          : 0,
      avgDuration: row.avg_duration ? Math.round(row.avg_duration) : null,
      avgTurns: row.avg_turns ? Math.round(row.avg_turns * 10) / 10 : null,
      totalTokens: Number(row.total_tokens),
    }));
  }

  // ==========================================
  // 私有方法
  // ==========================================

  private mapTraceStatus(status: string): AgentTraceStatus {
    const map: Record<string, AgentTraceStatus> = {
      pending: AgentTraceStatus.pending,
      completed: AgentTraceStatus.completed,
      failed: AgentTraceStatus.failed,
      interrupted: AgentTraceStatus.interrupted,
    };
    return map[status] || AgentTraceStatus.pending;
  }

  private mapSpanStatus(status: string): AgentSpanStatus {
    const map: Record<string, AgentSpanStatus> = {
      pending: AgentSpanStatus.pending,
      success: AgentSpanStatus.success,
      failed: AgentSpanStatus.failed,
      cancelled: AgentSpanStatus.cancelled,
    };
    return map[status] || AgentSpanStatus.pending;
  }
}
