/**
 * Digest Topic Service
 *
 * [INPUT]: Topic 创建/更新参数, 查询条件
 * [OUTPUT]: DigestTopic, DigestTopicEdition
 * [POS]: 公开话题管理服务，支持 SEO 和社区发现
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SUBSCRIPTION_LIMITS, ANTI_SPAM_LIMITS } from '../digest.constants';
import type {
  CreateTopicInput,
  UpdateTopicInput,
  PublicTopicsQuery,
  EditionsQuery,
  FollowTopicInput,
  TopicResponse,
  EditionResponse,
  EditionItemResponse,
} from '../dto';
import type {
  DigestTopic,
  DigestTopicEdition,
  DigestTopicEditionItem,
  DigestSubscription,
  SubscriptionTier,
  Prisma,
} from '../../../generated/prisma-main/client';

@Injectable()
export class DigestTopicService {
  private readonly logger = new Logger(DigestTopicService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建公开话题（从订阅发布）
   */
  async create(userId: string, input: CreateTopicInput): Promise<DigestTopic> {
    // 1. 验证订阅所有权
    const subscription = await this.prisma.digestSubscription.findFirst({
      where: { id: input.subscriptionId, userId, deletedAt: null },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // 2. 检查 Slug 唯一性
    const existingSlug = await this.prisma.digestTopic.findUnique({
      where: { slug: input.slug },
    });

    if (existingSlug) {
      throw new ConflictException('Slug already exists');
    }

    // 3. 检查用户 Topic 数量限制
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: { select: { tier: true } },
        _count: {
          select: {
            digestTopics: {
              where: { visibility: 'PUBLIC' },
            },
          },
        },
      },
    });

    const tier = (user?.subscription?.tier || 'FREE') as SubscriptionTier;
    const limits = SUBSCRIPTION_LIMITS[tier];
    const currentPublicCount = user?._count?.digestTopics || 0;

    if (
      input.visibility === 'PUBLIC' &&
      currentPublicCount >= limits.maxPublicTopics
    ) {
      throw new ConflictException(
        `Public topic limit reached. Max ${limits.maxPublicTopics} for ${tier} tier.`,
      );
    }

    // 4. 创建 Topic
    const topic = await this.prisma.digestTopic.create({
      data: {
        sourceSubscriptionId: input.subscriptionId,
        createdByUserId: userId,
        slug: input.slug,
        title: input.title,
        description: input.description ?? undefined,
        visibility: input.visibility,
        status: 'ACTIVE',
        // 从订阅复制默认配置
        topic: subscription.topic,
        interests: subscription.interests,
        locale: subscription.outputLocale || 'en',
        cron: subscription.cron,
        timezone: subscription.timezone,
        searchLimit: subscription.searchLimit,
        scrapeLimit: subscription.scrapeLimit,
        minItems: subscription.minItems,
        minScore: subscription.minScore,
        redeliveryPolicy: subscription.redeliveryPolicy,
        redeliveryCooldownDays: subscription.redeliveryCooldownDays,
      },
    });

    this.logger.log(
      `Created topic ${topic.id} (${topic.slug}) by user ${userId}`,
    );

    return topic;
  }

  /**
   * 更新话题
   */
  async update(
    userId: string,
    topicId: string,
    input: UpdateTopicInput,
  ): Promise<DigestTopic> {
    const existing = await this.prisma.digestTopic.findFirst({
      where: { id: topicId, createdByUserId: userId },
    });

    if (!existing) {
      throw new NotFoundException('Topic not found');
    }

    return this.prisma.digestTopic.update({
      where: { id: topicId },
      data: {
        title: input.title,
        description: input.description,
        visibility: input.visibility,
        topic: input.topic,
        interests: input.interests,
        searchLimit: input.searchLimit,
        scrapeLimit: input.scrapeLimit,
        minItems: input.minItems,
        minScore: input.minScore,
        redeliveryPolicy: input.redeliveryPolicy,
        redeliveryCooldownDays: input.redeliveryCooldownDays,
        cron: input.cron,
        timezone: input.timezone,
        locale: input.locale,
      },
    });
  }

  /**
   * 删除话题
   */
  async delete(userId: string, topicId: string): Promise<void> {
    const existing = await this.prisma.digestTopic.findFirst({
      where: { id: topicId, createdByUserId: userId },
    });

    if (!existing) {
      throw new NotFoundException('Topic not found');
    }

    await this.prisma.digestTopic.delete({
      where: { id: topicId },
    });

    this.logger.log(`Deleted topic ${topicId}`);
  }

  /**
   * 获取单个话题（通过 ID）
   */
  async findById(topicId: string): Promise<DigestTopic | null> {
    return this.prisma.digestTopic.findUnique({
      where: { id: topicId },
    });
  }

  /**
   * 获取单个话题（通过 Slug，公开访问）
   */
  async findBySlug(slug: string): Promise<DigestTopic | null> {
    return this.prisma.digestTopic.findFirst({
      where: {
        slug,
        visibility: { in: ['PUBLIC', 'UNLISTED'] },
        status: 'ACTIVE',
      },
    });
  }

  /**
   * 获取公开话题列表
   */
  async findPublicTopics(
    query: PublicTopicsQuery,
  ): Promise<{ items: DigestTopic[]; nextCursor: string | null }> {
    const { cursor, limit, sort, q, locale } = query;

    // 构建查询条件
    const where: Prisma.DigestTopicWhereInput = {
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      ...(locale && { locale }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { topic: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    // 排序
    let orderBy: Prisma.DigestTopicOrderByWithRelationInput;
    switch (sort) {
      case 'latest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'most_followed':
        orderBy = { subscriberCount: 'desc' };
        break;
      case 'quality':
      case 'trending':
      default:
        orderBy = { lastEditionAt: 'desc' };
        break;
    }

    const items = await this.prisma.digestTopic.findMany({
      where,
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy,
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
   * 获取用户的话题
   */
  async findUserTopics(userId: string): Promise<DigestTopic[]> {
    return this.prisma.digestTopic.findMany({
      where: { createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 关注话题（创建订阅）
   */
  async followTopic(
    userId: string,
    topicId: string,
    input: FollowTopicInput,
  ): Promise<DigestSubscription> {
    // 1. 获取话题
    const topic = await this.prisma.digestTopic.findFirst({
      where: {
        id: topicId,
        visibility: { in: ['PUBLIC', 'UNLISTED'] },
        status: 'ACTIVE',
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    // 2. 检查是否已关注
    const existingSubscription = await this.prisma.digestSubscription.findFirst(
      {
        where: {
          userId,
          followedTopicId: topicId,
          deletedAt: null,
        },
      },
    );

    if (existingSubscription) {
      throw new ConflictException('Already following this topic');
    }

    // 3. 检查订阅数量限制
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: { select: { tier: true } },
        _count: { select: { digestSubscriptions: true } },
      },
    });

    const tier = (user?.subscription?.tier || 'FREE') as SubscriptionTier;
    const limits = SUBSCRIPTION_LIMITS[tier];
    const currentCount = user?._count?.digestSubscriptions || 0;

    if (currentCount >= limits.maxSubscriptions) {
      throw new ConflictException(
        `Subscription limit reached. Max ${limits.maxSubscriptions} for ${tier} tier.`,
      );
    }

    // 4. 创建订阅
    const subscription = await this.prisma.digestSubscription.create({
      data: {
        userId,
        followedTopicId: topicId,
        name: topic.title,
        topic: topic.topic,
        interests: input.interests || topic.interests,
        searchLimit: topic.searchLimit,
        scrapeLimit: topic.scrapeLimit,
        minItems: input.minItems || topic.minItems,
        minScore: input.minScore || topic.minScore,
        redeliveryPolicy: topic.redeliveryPolicy,
        redeliveryCooldownDays: topic.redeliveryCooldownDays,
        languageMode: input.languageMode || 'FOLLOW_UI',
        outputLocale: input.outputLocale || topic.locale,
        cron: input.cron || topic.cron,
        timezone: input.timezone || topic.timezone,
        enabled: true,
      },
    });

    // 5. 更新订阅者计数
    await this.prisma.digestTopic.update({
      where: { id: topicId },
      data: { subscriberCount: { increment: 1 } },
    });

    this.logger.log(`User ${userId} followed topic ${topicId}`);

    return subscription;
  }

  /**
   * 取消关注话题
   */
  async unfollowTopic(userId: string, topicId: string): Promise<void> {
    const subscription = await this.prisma.digestSubscription.findFirst({
      where: {
        userId,
        followedTopicId: topicId,
        deletedAt: null,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Not following this topic');
    }

    // 软删除订阅
    await this.prisma.digestSubscription.update({
      where: { id: subscription.id },
      data: { deletedAt: new Date() },
    });

    // 减少订阅者计数
    await this.prisma.digestTopic.update({
      where: { id: topicId },
      data: { subscriberCount: { decrement: 1 } },
    });

    this.logger.log(`User ${userId} unfollowed topic ${topicId}`);
  }

  /**
   * 获取话题 Editions
   */
  async findEditions(
    topicId: string,
    query: EditionsQuery,
  ): Promise<{ items: DigestTopicEdition[]; nextCursor: string | null }> {
    const { cursor, limit } = query;

    const items = await this.prisma.digestTopicEdition.findMany({
      where: {
        topicId,
        status: 'SUCCEEDED',
      },
      take: Math.min(limit + 1, ANTI_SPAM_LIMITS.maxEditionsDisplay),
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
   * 获取 Edition 详情
   */
  async findEditionById(editionId: string): Promise<DigestTopicEdition | null> {
    return this.prisma.digestTopicEdition.findUnique({
      where: { id: editionId },
    });
  }

  /**
   * 获取 Edition Items
   */
  async findEditionItems(editionId: string): Promise<DigestTopicEditionItem[]> {
    return this.prisma.digestTopicEditionItem.findMany({
      where: { editionId },
      orderBy: { rank: 'asc' },
    });
  }

  /**
   * 格式化话题为 API 响应
   */
  toResponse(topic: DigestTopic): TopicResponse {
    return {
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      description: topic.description,
      visibility: topic.visibility,
      status: topic.status,
      topic: topic.topic,
      interests: topic.interests,
      locale: topic.locale,
      cron: topic.cron,
      timezone: topic.timezone,
      subscriberCount: topic.subscriberCount,
      lastEditionAt: topic.lastEditionAt,
      createdByUserId: topic.createdByUserId,
      createdAt: topic.createdAt,
    };
  }

  /**
   * 格式化 Edition 为 API 响应
   */
  toEditionResponse(
    edition: DigestTopicEdition & { _count?: { items: number } },
  ): EditionResponse {
    return {
      id: edition.id,
      topicId: edition.topicId,
      scheduledAt: edition.scheduledAt,
      finishedAt: edition.finishedAt,
      outputLocale: edition.outputLocale,
      narrativeMarkdown: edition.narrativeMarkdown,
      itemCount: edition._count?.items || 0,
    };
  }

  /**
   * 格式化 Edition Item 为 API 响应
   */
  toEditionItemResponse(
    item: DigestTopicEditionItem & {
      content?: { siteName: string | null; favicon: string | null };
    },
  ): EditionItemResponse {
    return {
      id: item.id,
      rank: item.rank,
      scoreOverall: item.scoreOverall,
      titleSnapshot: item.titleSnapshot,
      urlSnapshot: item.urlSnapshot,
      aiSummarySnapshot: item.aiSummarySnapshot,
      siteName: item.content?.siteName ?? null,
      favicon: item.content?.favicon ?? null,
    };
  }
}
