/**
 * [INPUT]: Admin 查询参数（分页）与 runtime toggle 更新请求
 * [OUTPUT]: 视频转写任务概览、节点资源、预算/队列状态、开关审计信息
 * [POS]: Video Transcript Admin 可观测与配置服务
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  VIDEO_TRANSCRIPT_CLOUD_BUDGET_ALERT_RATIO,
  VIDEO_TRANSCRIPT_LOCAL_OFFLINE_ALERT_MS,
} from './video-transcript.constants';
import {
  VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE,
  VIDEO_TRANSCRIPT_LOCAL_QUEUE,
} from '../queue/queue.constants';
import { VideoTranscriptBudgetService } from './video-transcript-budget.service';
import { VideoTranscriptHeartbeatService } from './video-transcript-heartbeat.service';
import type {
  VideoTranscriptCloudJobData,
  VideoTranscriptLocalJobData,
} from './video-transcript.types';
import { VideoTranscriptRuntimeConfigService } from './video-transcript-runtime-config.service';
import { VideoTranscriptService } from './video-transcript.service';

const LOCAL_ENABLED_AUDIT_ACTION = 'VIDEO_TRANSCRIPT_LOCAL_ENABLED_UPDATED';
const BUDGET_EXCEEDED_ERROR_MESSAGE = 'Cloud fallback daily budget exceeded';

@Injectable()
export class VideoTranscriptAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetService: VideoTranscriptBudgetService,
    private readonly heartbeatService: VideoTranscriptHeartbeatService,
    private readonly runtimeConfigService: VideoTranscriptRuntimeConfigService,
    private readonly transcriptService: VideoTranscriptService,
    @InjectQueue(VIDEO_TRANSCRIPT_LOCAL_QUEUE)
    private readonly localQueue: Queue<VideoTranscriptLocalJobData>,
    @InjectQueue(VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE)
    private readonly cloudQueue: Queue<VideoTranscriptCloudJobData>,
  ) {}

  async getOverview() {
    const budget = await this.budgetService.getCurrentBudgetUsage();
    const timezoneRange = await this.getTimezoneDayRange(budget.timezone);
    const timeoutMs = this.transcriptService.getFallbackTimeoutMs();

    const [
      total,
      pending,
      downloading,
      extractingAudio,
      transcribing,
      uploading,
      completed,
      failed,
      cancelled,
      localCompleted,
      cloudCompleted,
      todayTotal,
      todayCompleted,
      todayFailed,
      todayCancelled,
      todayLocalCompleted,
      todayCloudFallbackTriggered,
      todayBudgetGateTriggered,
      localCompletedWithinTimeout,
      averageDurationSec,
    ] = await Promise.all([
      this.prisma.videoTranscriptTask.count(),
      this.prisma.videoTranscriptTask.count({ where: { status: 'PENDING' } }),
      this.prisma.videoTranscriptTask.count({
        where: { status: 'DOWNLOADING' },
      }),
      this.prisma.videoTranscriptTask.count({
        where: { status: 'EXTRACTING_AUDIO' },
      }),
      this.prisma.videoTranscriptTask.count({
        where: { status: 'TRANSCRIBING' },
      }),
      this.prisma.videoTranscriptTask.count({ where: { status: 'UPLOADING' } }),
      this.prisma.videoTranscriptTask.count({ where: { status: 'COMPLETED' } }),
      this.prisma.videoTranscriptTask.count({ where: { status: 'FAILED' } }),
      this.prisma.videoTranscriptTask.count({ where: { status: 'CANCELLED' } }),
      this.prisma.videoTranscriptTask.count({
        where: {
          status: 'COMPLETED',
          executor: 'LOCAL',
        },
      }),
      this.prisma.videoTranscriptTask.count({
        where: {
          status: 'COMPLETED',
          executor: 'CLOUD_FALLBACK',
        },
      }),
      this.prisma.videoTranscriptTask.count({
        where: {
          createdAt: {
            gte: timezoneRange.start,
            lt: timezoneRange.end,
          },
        },
      }),
      this.prisma.videoTranscriptTask.count({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: timezoneRange.start,
            lt: timezoneRange.end,
          },
        },
      }),
      this.prisma.videoTranscriptTask.count({
        where: {
          status: 'FAILED',
          createdAt: {
            gte: timezoneRange.start,
            lt: timezoneRange.end,
          },
        },
      }),
      this.prisma.videoTranscriptTask.count({
        where: {
          status: 'CANCELLED',
          createdAt: {
            gte: timezoneRange.start,
            lt: timezoneRange.end,
          },
        },
      }),
      this.prisma.videoTranscriptTask.count({
        where: {
          status: 'COMPLETED',
          executor: 'LOCAL',
          createdAt: {
            gte: timezoneRange.start,
            lt: timezoneRange.end,
          },
        },
      }),
      this.prisma.videoTranscriptTask.count({
        where: {
          executor: 'CLOUD_FALLBACK',
          createdAt: {
            gte: timezoneRange.start,
            lt: timezoneRange.end,
          },
        },
      }),
      this.prisma.videoTranscriptTask.count({
        where: {
          error: BUDGET_EXCEEDED_ERROR_MESSAGE,
          createdAt: {
            gte: timezoneRange.start,
            lt: timezoneRange.end,
          },
        },
      }),
      this.countLocalCompletedWithinTimeout(
        timezoneRange.start,
        timezoneRange.end,
        timeoutMs,
      ),
      this.getAverageDurationSeconds(timezoneRange.start, timezoneRange.end),
    ]);

    const todayFailureCount = todayFailed + todayCancelled;
    const todaySuccessRate = this.toRate(todayCompleted, todayTotal);
    const todayFailureRate = this.toRate(todayFailureCount, todayTotal);
    const cloudFallbackTriggerRate = this.toRate(
      todayCloudFallbackTriggered,
      todayTotal,
    );
    const localWithinTimeoutRate = this.toRate(
      localCompletedWithinTimeout,
      todayLocalCompleted,
    );

    return {
      total,
      status: {
        pending,
        downloading,
        extractingAudio,
        transcribing,
        uploading,
        completed,
        failed,
        cancelled,
      },
      executor: {
        localCompleted,
        cloudCompleted,
      },
      budget,
      today: {
        timezone: budget.timezone,
        startAt: timezoneRange.start,
        endAt: timezoneRange.end,
        total: todayTotal,
        completed: todayCompleted,
        failed: todayFailed,
        cancelled: todayCancelled,
        successRate: todaySuccessRate,
        failureRate: todayFailureRate,
        cloudFallbackTriggered: todayCloudFallbackTriggered,
        cloudFallbackTriggerRate,
        localCompletedWithinTimeout,
        localWithinTimeoutRate,
        averageDurationSec: averageDurationSec,
        budgetGateTriggered: todayBudgetGateTriggered,
      },
    };
  }

  async getResources() {
    const [localCounts, cloudCounts, nodes, budget] = await Promise.all([
      this.localQueue.getJobCounts(),
      this.cloudQueue.getJobCounts(),
      this.heartbeatService.getLiveNodes(),
      this.budgetService.getCurrentBudgetUsage(),
    ]);

    const now = Date.now();
    const staleNodes = nodes.filter((node) => {
      const updatedAt = new Date(node.updatedAt).getTime();
      return now - updatedAt > VIDEO_TRANSCRIPT_LOCAL_OFFLINE_ALERT_MS;
    });

    const alerts = {
      budgetOver80Percent:
        budget.dailyBudgetUsd > 0 &&
        budget.usedUsd / budget.dailyBudgetUsd >=
          VIDEO_TRANSCRIPT_CLOUD_BUDGET_ALERT_RATIO,
      localNodeOffline: staleNodes.length > 0,
      staleNodeIds: staleNodes.map((node) => node.nodeId),
    };

    return {
      queues: {
        local: {
          name: VIDEO_TRANSCRIPT_LOCAL_QUEUE,
          waiting: localCounts.waiting ?? 0,
          active: localCounts.active ?? 0,
          completed: localCounts.completed ?? 0,
          failed: localCounts.failed ?? 0,
          delayed: localCounts.delayed ?? 0,
        },
        cloudFallback: {
          name: VIDEO_TRANSCRIPT_CLOUD_FALLBACK_QUEUE,
          waiting: cloudCounts.waiting ?? 0,
          active: cloudCounts.active ?? 0,
          completed: cloudCounts.completed ?? 0,
          failed: cloudCounts.failed ?? 0,
          delayed: cloudCounts.delayed ?? 0,
        },
      },
      nodes,
      budget,
      alerts,
    };
  }

  async getConfig() {
    const [runtime, auditLogs] = await Promise.all([
      this.runtimeConfigService.getSnapshot(),
      this.prisma.adminAuditLog.findMany({
        where: {
          action: LOCAL_ENABLED_AUDIT_ACTION,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          actorUserId: true,
          reason: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      localEnabled: runtime.localEnabled,
      source: runtime.source,
      overrideRaw: runtime.overrideRaw,
      audits: auditLogs,
    };
  }

  async updateLocalEnabled(params: {
    actorUserId: string;
    enabled: boolean;
    reason?: string;
  }) {
    const previous = await this.runtimeConfigService.getSnapshot();
    await this.runtimeConfigService.setLocalEnabledOverride(params.enabled);
    const current = await this.runtimeConfigService.getSnapshot();

    const normalizedReason = params.reason?.trim()
      ? params.reason.trim()
      : `Set local enabled to ${params.enabled}`;

    const audit = await this.prisma.adminAuditLog.create({
      data: {
        actorUserId: params.actorUserId,
        targetUserId: null,
        action: LOCAL_ENABLED_AUDIT_ACTION,
        reason: normalizedReason,
        metadata: this.transcriptService.toPrismaJson({
          previous,
          current,
        }),
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return {
      localEnabled: current.localEnabled,
      source: current.source,
      overrideRaw: current.overrideRaw,
      auditLogId: audit.id,
      updatedAt: audit.createdAt,
    };
  }

  async getTasks(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.videoTranscriptTask.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.videoTranscriptTask.count(),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private toRate(numerator: number, denominator: number): number {
    if (denominator <= 0) {
      return 0;
    }
    return Number(((numerator / denominator) * 100).toFixed(2));
  }

  private async getTimezoneDayRange(timezone: string): Promise<{
    start: Date;
    end: Date;
  }> {
    const rows = await this.prisma.$queryRaw<Array<{ start: Date; end: Date }>>`
      SELECT
        (date_trunc('day', NOW() AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone}) AS "start",
        ((date_trunc('day', NOW() AT TIME ZONE ${timezone}) + INTERVAL '1 day') AT TIME ZONE ${timezone}) AS "end"
    `;

    return {
      start: rows[0]?.start ?? new Date(0),
      end: rows[0]?.end ?? new Date(0),
    };
  }

  private async countLocalCompletedWithinTimeout(
    start: Date,
    end: Date,
    timeoutMs: number,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(*) AS "count"
      FROM "VideoTranscriptTask"
      WHERE "createdAt" >= ${start}
        AND "createdAt" < ${end}
        AND "status" = 'COMPLETED'::"VideoTranscriptTaskStatus"
        AND "executor" = 'LOCAL'::"VideoTranscriptExecutor"
        AND "localStartedAt" IS NOT NULL
        AND "completedAt" IS NOT NULL
        AND "completedAt" <= "localStartedAt" + (${timeoutMs} * INTERVAL '1 millisecond')
    `;

    return Number(rows[0]?.count ?? 0);
  }

  private async getAverageDurationSeconds(
    start: Date,
    end: Date,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ avgSec: number | null }>>`
      SELECT
        COALESCE(
          EXTRACT(EPOCH FROM AVG("completedAt" - "startedAt")),
          0
        )::double precision AS "avgSec"
      FROM "VideoTranscriptTask"
      WHERE "createdAt" >= ${start}
        AND "createdAt" < ${end}
        AND "status" = 'COMPLETED'::"VideoTranscriptTaskStatus"
        AND "startedAt" IS NOT NULL
        AND "completedAt" IS NOT NULL
    `;

    const value = rows[0]?.avgSec ?? 0;
    return Number(value.toFixed(3));
  }
}
