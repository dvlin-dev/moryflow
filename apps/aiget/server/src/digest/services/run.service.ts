/**
 * Digest Run Service
 *
 * [INPUT]: subscriptionId, userId, 运行参数
 * [OUTPUT]: DigestRun, DigestRunItem
 * [POS]: 订阅运行执行服务，处理搜索、评分、去重、投递
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SCORE_WEIGHTS, BILLING, PROMPT_VERSIONS } from '../digest.constants';
import type { ListRunsQuery } from '../dto';
import type {
  DigestRun,
  DigestRunItem,
  DigestSubscription,
  Prisma,
} from '../../../generated/prisma-main/client';

export interface RunResult {
  itemsCandidate: number;
  itemsSelected: number;
  itemsDelivered: number;
  itemsDedupSkipped: number;
  itemsRedelivered: number;
  narrativeTokensUsed?: number;
}

export interface BillingData {
  model: string;
  totalCredits: number;
  charged: boolean;
  breakdown: Record<
    string,
    {
      count: number;
      costPerCall: number;
      subtotalCredits: number;
    }
  >;
}

export interface BillingBreakdown {
  [key: string]: {
    count: number;
    costPerCall: number;
    subtotalCredits: number;
  };
}

@Injectable()
export class DigestRunService {
  private readonly logger = new Logger(DigestRunService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建运行记录
   */
  async createRun(
    subscriptionId: string,
    userId: string,
    scheduledAt: Date,
    source: 'SCHEDULED' | 'MANUAL',
    outputLocale: string,
  ): Promise<DigestRun> {
    return this.prisma.digestRun.create({
      data: {
        subscriptionId,
        userId,
        scheduledAt,
        source,
        outputLocale,
        status: 'PENDING',
        billing: {
          model: BILLING.model,
          totalCredits: 0,
          charged: false,
          breakdown: {},
        },
      },
    });
  }

  /**
   * 开始运行
   */
  async startRun(runId: string): Promise<DigestRun> {
    return this.prisma.digestRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });
  }

  /**
   * 完成运行（成功）
   */
  async completeRun(
    runId: string,
    result: RunResult,
    billing: { totalCredits: number; breakdown: BillingBreakdown },
    narrativeMarkdown?: string,
  ): Promise<DigestRun> {
    return this.prisma.digestRun.update({
      where: { id: runId },
      data: {
        status: 'SUCCEEDED',
        finishedAt: new Date(),
        narrativeMarkdown,
        result: result as unknown as Prisma.InputJsonValue,
        billing: {
          model: BILLING.model,
          totalCredits: billing.totalCredits,
          charged: billing.totalCredits > 0,
          breakdown: billing.breakdown,
        },
      },
    });
  }

  /**
   * 完成运行（失败）
   */
  async failRun(runId: string, error: string): Promise<DigestRun> {
    return this.prisma.digestRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        error,
      },
    });
  }

  /**
   * 创建运行条目
   */
  async createRunItem(
    runId: string,
    subscriptionId: string,
    userId: string,
    contentId: string,
    data: {
      canonicalUrlHash: string;
      scoreRelevance: number;
      scoreOverall: number;
      scoringReason?: string;
      rank: number;
      titleSnapshot: string;
      urlSnapshot: string;
      aiSummarySnapshot?: string;
    },
  ): Promise<DigestRunItem> {
    return this.prisma.digestRunItem.create({
      data: {
        runId,
        subscriptionId,
        userId,
        contentId,
        canonicalUrlHash: data.canonicalUrlHash,
        scoreRelevance: data.scoreRelevance,
        scoreOverall: data.scoreOverall,
        scoringReason: data.scoringReason,
        rank: data.rank,
        titleSnapshot: data.titleSnapshot,
        urlSnapshot: data.urlSnapshot,
        aiSummarySnapshot: data.aiSummarySnapshot,
      },
    });
  }

  /**
   * 批量创建运行条目
   */
  async createRunItems(
    runId: string,
    subscriptionId: string,
    userId: string,
    items: Array<{
      contentId: string;
      canonicalUrlHash: string;
      scoreRelevance: number;
      scoreOverall: number;
      scoringReason?: string;
      rank: number;
      titleSnapshot: string;
      urlSnapshot: string;
      aiSummarySnapshot?: string;
    }>,
  ): Promise<number> {
    const result = await this.prisma.digestRunItem.createMany({
      data: items.map((item) => ({
        runId,
        subscriptionId,
        userId,
        contentId: item.contentId,
        canonicalUrlHash: item.canonicalUrlHash,
        scoreRelevance: item.scoreRelevance,
        scoreOverall: item.scoreOverall,
        scoringReason: item.scoringReason,
        rank: item.rank,
        titleSnapshot: item.titleSnapshot,
        urlSnapshot: item.urlSnapshot,
        aiSummarySnapshot: item.aiSummarySnapshot,
      })),
    });
    return result.count;
  }

  /**
   * 投递条目到 Inbox
   */
  async deliverItems(runId: string, itemIds: string[]): Promise<void> {
    await this.prisma.digestRunItem.updateMany({
      where: {
        id: { in: itemIds },
        runId,
      },
      data: {
        deliveredAt: new Date(),
      },
    });
  }

  /**
   * 获取单个运行
   */
  async findOne(userId: string, runId: string): Promise<DigestRun | null> {
    return this.prisma.digestRun.findFirst({
      where: { id: runId, userId },
    });
  }

  /**
   * 获取运行列表
   */
  async findMany(
    userId: string,
    subscriptionId: string,
    query: ListRunsQuery,
  ): Promise<{ items: DigestRun[]; nextCursor: string | null }> {
    const { cursor, limit, status } = query;

    const items = await this.prisma.digestRun.findMany({
      where: {
        userId,
        subscriptionId,
        ...(status && { status }),
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { scheduledAt: 'desc' },
    });

    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * 获取运行条目
   */
  async findRunItems(runId: string): Promise<DigestRunItem[]> {
    return this.prisma.digestRunItem.findMany({
      where: { runId },
      orderBy: { rank: 'asc' },
    });
  }

  /**
   * 计算综合评分
   */
  calculateOverallScore(
    relevance: number,
    impact: number,
    quality: number,
  ): number {
    return (
      relevance * SCORE_WEIGHTS.relevance +
      impact * SCORE_WEIGHTS.impact +
      quality * SCORE_WEIGHTS.quality
    );
  }

  /**
   * 检查内容是否已投递（去重）
   */
  async isContentDelivered(
    subscriptionId: string,
    canonicalUrlHash: string,
  ): Promise<{ delivered: boolean; lastDeliveredAt: Date | null }> {
    const existingItem = await this.prisma.digestRunItem.findFirst({
      where: {
        canonicalUrlHash,
        deliveredAt: { not: null },
        subscriptionId,
      },
      orderBy: { deliveredAt: 'desc' },
      select: { deliveredAt: true },
    });

    return {
      delivered: !!existingItem,
      lastDeliveredAt: existingItem?.deliveredAt ?? null,
    };
  }
}
