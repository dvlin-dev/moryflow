/**
 * Digest Admin Service
 *
 * [INPUT]: 管理员查询条件
 * [OUTPUT]: 系统统计、订阅/话题/运行列表
 * [POS]: 管理后台数据访问层
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DigestTopicVisibility,
  DigestTopicStatus,
  DigestRunStatus,
} from '../../../generated/prisma-main/client';

export interface AdminListQuery {
  cursor?: string;
  limit?: number;
}

export interface AdminSubscriptionQuery extends AdminListQuery {
  userId?: string;
  enabled?: boolean;
}

export interface AdminTopicQuery extends AdminListQuery {
  visibility?: DigestTopicVisibility;
  status?: DigestTopicStatus;
}

export interface AdminRunQuery extends AdminListQuery {
  status?: DigestRunStatus;
  subscriptionId?: string;
}

@Injectable()
export class DigestAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取系统统计
   */
  async getStats() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      totalTopics,
      publicTopics,
      totalRuns,
      successfulRuns,
      failedRuns,
      totalContent,
    ] = await Promise.all([
      this.prisma.digestSubscription.count({ where: { deletedAt: null } }),
      this.prisma.digestSubscription.count({
        where: { deletedAt: null, enabled: true },
      }),
      this.prisma.digestTopic.count(),
      this.prisma.digestTopic.count({ where: { visibility: 'PUBLIC' } }),
      this.prisma.digestRun.count(),
      this.prisma.digestRun.count({ where: { status: 'SUCCEEDED' } }),
      this.prisma.digestRun.count({ where: { status: 'FAILED' } }),
      this.prisma.contentItem.count(),
    ]);

    return {
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
      },
      topics: {
        total: totalTopics,
        public: publicTopics,
      },
      runs: {
        total: totalRuns,
        succeeded: successfulRuns,
        failed: failedRuns,
        successRate:
          totalRuns > 0
            ? Math.round((successfulRuns / totalRuns) * 100 * 100) / 100
            : 0,
      },
      contentPool: {
        totalItems: totalContent,
      },
    };
  }

  /**
   * 获取订阅列表（管理员视图）
   */
  async listSubscriptions(query: AdminSubscriptionQuery) {
    const take = Math.min(query.limit || 20, 100);

    const subscriptions = await this.prisma.digestSubscription.findMany({
      where: {
        deletedAt: null,
        ...(query.userId && { userId: query.userId }),
        ...(query.enabled !== undefined && { enabled: query.enabled }),
      },
      take: take + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { runs: true } },
      },
    });

    const hasMore = subscriptions.length > take;
    if (hasMore) {
      subscriptions.pop();
    }

    return {
      items: subscriptions.map((s) => ({
        id: s.id,
        name: s.name,
        topic: s.topic,
        interests: s.interests,
        enabled: s.enabled,
        cron: s.cron,
        lastRunAt: s.lastRunAt,
        nextRunAt: s.nextRunAt,
        createdAt: s.createdAt,
        user: s.user,
        runCount: s._count.runs,
      })),
      nextCursor: hasMore ? subscriptions[subscriptions.length - 1]?.id : null,
    };
  }

  /**
   * 获取话题列表（管理员视图）
   */
  async listTopics(query: AdminTopicQuery) {
    const take = Math.min(query.limit || 20, 100);

    const topics = await this.prisma.digestTopic.findMany({
      where: {
        ...(query.visibility && { visibility: query.visibility }),
        ...(query.status && { status: query.status }),
      },
      take: take + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        _count: { select: { editions: true } },
      },
    });

    const hasMore = topics.length > take;
    if (hasMore) {
      topics.pop();
    }

    return {
      items: topics.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        visibility: t.visibility,
        status: t.status,
        subscriberCount: t.subscriberCount,
        lastEditionAt: t.lastEditionAt,
        createdAt: t.createdAt,
        createdBy: t.createdBy,
        editionCount: t._count.editions,
      })),
      nextCursor: hasMore ? topics[topics.length - 1]?.id : null,
    };
  }

  /**
   * 更新话题状态
   */
  async updateTopicStatus(topicId: string, status: DigestTopicStatus) {
    const topic = await this.prisma.digestTopic.update({
      where: { id: topicId },
      data: { status },
    });

    return {
      id: topic.id,
      status: topic.status,
    };
  }

  /**
   * 删除话题（硬删除）
   */
  async deleteTopic(topicId: string): Promise<void> {
    await this.prisma.digestTopic.delete({ where: { id: topicId } });
  }

  /**
   * 获取运行历史（管理员视图）
   */
  async listRuns(query: AdminRunQuery) {
    const take = Math.min(query.limit || 20, 100);

    const runs = await this.prisma.digestRun.findMany({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.subscriptionId && { subscriptionId: query.subscriptionId }),
      },
      take: take + 1,
      ...(query.cursor && {
        cursor: { id: query.cursor },
        skip: 1,
      }),
      orderBy: { scheduledAt: 'desc' },
      include: {
        subscription: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
    });

    const hasMore = runs.length > take;
    if (hasMore) {
      runs.pop();
    }

    return {
      items: runs.map((r) => ({
        id: r.id,
        subscriptionId: r.subscriptionId,
        subscriptionName: r.subscription?.name,
        userId: r.userId,
        userEmail: r.user?.email,
        scheduledAt: r.scheduledAt,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        status: r.status,
        source: r.source,
        result: r.result,
        billing: r.billing,
        error: r.error,
      })),
      nextCursor: hasMore ? runs[runs.length - 1]?.id : null,
    };
  }
}
