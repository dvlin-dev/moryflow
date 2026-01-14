/**
 * Digest Admin Service
 *
 * [INPUT]: 管理员查询条件
 * [OUTPUT]: 系统统计、订阅/话题/运行列表、话题精选配置
 * [POS]: 管理后台数据访问层
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DigestTopicStatus,
  DigestRunStatus,
} from '../../../generated/prisma-main/client';
import type {
  AdminTopicsQuery,
  SetFeaturedInput,
  ReorderFeaturedInput,
} from '../dto';

export interface AdminListQuery {
  page?: number;
  limit?: number;
}

export interface AdminSubscriptionQuery extends AdminListQuery {
  userId?: string;
  enabled?: boolean;
}

export interface AdminRunQuery extends AdminListQuery {
  status?: DigestRunStatus;
  subscriptionId?: string;
}

@Injectable()
export class DigestAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取话题列表（分页 + 搜索 + 过滤）
   */
  async listTopics(query: AdminTopicsQuery) {
    const { page, limit, search, featured, visibility, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(featured !== undefined && { featured }),
      ...(visibility && { visibility }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [topics, total] = await Promise.all([
      this.prisma.digestTopic.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { featured: 'desc' },
          { featuredOrder: 'asc' },
          { subscriberCount: 'desc' },
        ],
        include: {
          createdBy: { select: { id: true, email: true, name: true } },
          featuredBy: { select: { id: true, email: true, name: true } },
          _count: { select: { editions: true, followers: true } },
        },
      }),
      this.prisma.digestTopic.count({ where }),
    ]);

    return {
      items: topics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取精选话题列表（Admin 视角，不过滤 visibility/status）
   */
  async getFeaturedTopics() {
    return this.prisma.digestTopic.findMany({
      where: { featured: true },
      orderBy: { featuredOrder: 'asc' },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        featuredBy: { select: { id: true, email: true, name: true } },
        _count: { select: { editions: true, followers: true } },
      },
    });
  }

  /**
   * 获取单个话题详情（包含 Admin 需要的关联字段）
   */
  async getTopic(id: string) {
    const topic = await this.prisma.digestTopic.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        featuredBy: { select: { id: true, email: true, name: true } },
        _count: { select: { editions: true, followers: true } },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    return topic;
  }

  /**
   * 设置/取消精选
   */
  async setFeatured(
    topicId: string,
    adminUserId: string,
    input: SetFeaturedInput,
  ) {
    const topic = await this.prisma.digestTopic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    let featuredOrder = input.featuredOrder;
    if (input.featured && featuredOrder === undefined) {
      const maxOrder = await this.prisma.digestTopic.aggregate({
        where: { featured: true },
        _max: { featuredOrder: true },
      });
      featuredOrder = (maxOrder._max.featuredOrder ?? -1) + 1;
    }

    return this.prisma.digestTopic.update({
      where: { id: topicId },
      data: {
        featured: input.featured,
        featuredOrder: input.featured ? featuredOrder : null,
        featuredAt: input.featured ? new Date() : null,
        featuredByUserId: input.featured ? adminUserId : null,
      },
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        featuredBy: { select: { id: true, email: true, name: true } },
        _count: { select: { editions: true, followers: true } },
      },
    });
  }

  /**
   * 批量重排精选顺序
   */
  async reorderFeatured(input: ReorderFeaturedInput) {
    const { topicIds } = input;

    const topics = await this.prisma.digestTopic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true, featured: true },
    });

    if (topics.length !== topicIds.length) {
      throw new NotFoundException('Topic not found');
    }

    const notFeaturedIds = topics.filter((t) => !t.featured).map((t) => t.id);
    if (notFeaturedIds.length > 0) {
      throw new BadRequestException('All topics must be featured to reorder');
    }

    await this.prisma.$transaction(
      topicIds.map((id, index) =>
        this.prisma.digestTopic.update({
          where: { id },
          data: { featuredOrder: index },
        }),
      ),
    );

    return this.getFeaturedTopics();
  }

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
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(query.userId && { userId: query.userId }),
      ...(query.enabled !== undefined && { enabled: query.enabled }),
    };

    const [subscriptions, total] = await Promise.all([
      this.prisma.digestSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true } },
          _count: { select: { runs: true } },
        },
      }),
      this.prisma.digestSubscription.count({ where }),
    ]);

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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取运行历史（管理员视图）
   */
  async listRuns(query: AdminRunQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(query.status && { status: query.status }),
      ...(query.subscriptionId && { subscriptionId: query.subscriptionId }),
    };

    const [runs, total] = await Promise.all([
      this.prisma.digestRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          subscription: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
        },
      }),
      this.prisma.digestRun.count({ where }),
    ]);

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
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 更新话题状态
   */
  async updateTopicStatus(topicId: string, status: DigestTopicStatus) {
    const topic = await this.prisma.digestTopic.update({
      where: { id: topicId },
      data: { status },
      select: { id: true, status: true },
    });

    return topic;
  }

  /**
   * 删除话题（硬删除）
   */
  async deleteTopic(topicId: string): Promise<void> {
    await this.prisma.digestTopic.delete({ where: { id: topicId } });
  }
}
