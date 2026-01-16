/**
 * Discover Service
 *
 * [INPUT]: Feed 类型（featured/trending）、数量限制
 * [OUTPUT]: Feed 内容、Featured/Trending Topics 列表
 * [POS]: Discover 模块核心服务，聚合多 Topic 内容，带 Redis 缓存
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import type {
  DiscoverFeedItem,
  DiscoverTopicItem,
  DiscoverTrendingTopicItem,
} from '../dto';

// 缓存配置
const CACHE_TTL_SECONDS = 5 * 60; // 5 分钟
const CACHE_KEYS = {
  featuredFeed: (limit: number) => `discover:feed:featured:${limit}`,
  trendingFeed: (limit: number) => `discover:feed:trending:${limit}`,
  featuredTopics: (limit: number) => `discover:topics:featured:${limit}`,
  trendingTopics: (limit: number) => `discover:topics:trending:${limit}`,
};

// Feed 配置
const MAX_TOPICS_PER_FEED = 10; // 从最多 10 个 Topic 获取内容

interface CachedFeedResponse {
  items: DiscoverFeedItem[];
  generatedAt: string;
}

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 获取 Discover Feed
   */
  async getFeed(
    type: 'featured' | 'trending',
    limit: number,
  ): Promise<{ items: DiscoverFeedItem[]; generatedAt: Date }> {
    const cacheKey =
      type === 'featured'
        ? CACHE_KEYS.featuredFeed(limit)
        : CACHE_KEYS.trendingFeed(limit);

    // 尝试从缓存获取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CachedFeedResponse;
        return {
          items: parsed.items,
          generatedAt: new Date(parsed.generatedAt),
        };
      } catch {
        // 缓存解析失败，重新生成
      }
    }

    // 从数据库获取
    const items =
      type === 'featured'
        ? await this.getFeaturedFeedFromDb(limit)
        : await this.getTrendingFeedFromDb(limit);

    const generatedAt = new Date();
    const response = { items, generatedAt };

    // 缓存结果
    await this.redis.set(
      cacheKey,
      JSON.stringify({ items, generatedAt: generatedAt.toISOString() }),
      CACHE_TTL_SECONDS,
    );

    return response;
  }

  /**
   * 获取 Featured Topics
   */
  async getFeaturedTopics(limit: number): Promise<DiscoverTopicItem[]> {
    const cacheKey = CACHE_KEYS.featuredTopics(limit);

    // 尝试从缓存获取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as DiscoverTopicItem[];
      } catch {
        // 缓存解析失败，重新生成
      }
    }

    // 从数据库获取
    const topics = await this.prisma.digestTopic.findMany({
      where: {
        featured: true,
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      },
      orderBy: { featuredOrder: 'asc' },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        subscriberCount: true,
        lastEditionAt: true,
      },
    });

    // 缓存结果
    await this.redis.set(cacheKey, JSON.stringify(topics), CACHE_TTL_SECONDS);

    return topics;
  }

  /**
   * 获取 Trending Topics
   */
  async getTrendingTopics(limit: number): Promise<DiscoverTrendingTopicItem[]> {
    const cacheKey = CACHE_KEYS.trendingTopics(limit);

    // 尝试从缓存获取
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as DiscoverTrendingTopicItem[];
      } catch {
        // 缓存解析失败，重新生成
      }
    }

    // 从数据库获取（按订阅数 + 最近更新时间排序）
    const topics = await this.prisma.digestTopic.findMany({
      where: {
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        lastEditionAt: { not: null }, // 必须有内容
      },
      orderBy: [{ subscriberCount: 'desc' }, { lastEditionAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        subscriberCount: true,
        lastEditionAt: true,
      },
    });

    // 计算 trending score（简单版本：订阅数 * 100 + 天数惩罚）
    const result: DiscoverTrendingTopicItem[] = topics.map((topic) => {
      const daysSinceLastEdition = topic.lastEditionAt
        ? Math.floor(
            (Date.now() - topic.lastEditionAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 999;
      const trendingScore = Math.max(
        0,
        topic.subscriberCount * 100 - daysSinceLastEdition * 10,
      );
      return { ...topic, trendingScore };
    });

    // 缓存结果
    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * 清除 Discover 缓存（当 Topic Edition 完成或 Featured 配置变更时调用）
   */
  async invalidateCache(): Promise<void> {
    // 使用 pattern 删除所有 discover 缓存
    const keys = await this.redis.client.keys('discover:*');
    if (keys.length > 0) {
      await this.redis.client.del(...keys);
      this.logger.log(`Invalidated ${keys.length} discover cache keys`);
    }
  }

  // ========== 私有方法 ==========

  /**
   * 从数据库获取 Feed（公共方法）
   */
  private async getFeedFromDb(
    topics: Array<{
      id: string;
      slug: string;
      title: string;
      subscriberCount: number;
    }>,
    limit: number,
  ): Promise<DiscoverFeedItem[]> {
    if (topics.length === 0) {
      return [];
    }

    const topicIds = topics.map((t) => t.id);
    const topicMap = new Map(topics.map((t) => [t.id, t]));

    // 获取每个 Topic 的最新 Edition
    const latestEditions = await this.prisma.digestTopicEdition.findMany({
      where: {
        topicId: { in: topicIds },
        status: 'SUCCEEDED',
      },
      orderBy: { scheduledAt: 'desc' },
      distinct: ['topicId'],
      select: {
        id: true,
        topicId: true,
        scheduledAt: true,
      },
    });

    if (latestEditions.length === 0) {
      return [];
    }

    const editionIds = latestEditions.map((e) => e.id);
    const editionMap = new Map(latestEditions.map((e) => [e.id, e]));

    // 获取这些 Edition 的 Items
    const items = await this.prisma.digestTopicEditionItem.findMany({
      where: {
        editionId: { in: editionIds },
      },
      orderBy: [{ editionId: 'asc' }, { rank: 'asc' }],
      take: limit,
      include: {
        content: { select: { siteName: true, favicon: true } },
        edition: { select: { topicId: true } },
      },
    });

    // 转换为 DiscoverFeedItem，过滤掉无效 topic 的条目
    const result: DiscoverFeedItem[] = [];
    for (const item of items) {
      const edition = editionMap.get(item.editionId);
      const topic = edition ? topicMap.get(edition.topicId) : null;

      if (!edition || !topic) {
        this.logger.warn(
          `Feed item ${item.id} has no associated topic (editionId: ${item.editionId})`,
        );
        continue;
      }

      result.push({
        id: item.id,
        title: item.titleSnapshot,
        url: item.urlSnapshot,
        aiSummary: item.aiSummarySnapshot,
        siteName: item.content?.siteName ?? null,
        favicon: item.content?.favicon ?? null,
        scoreOverall: item.scoreOverall,
        topic: {
          id: topic.id,
          slug: topic.slug,
          title: topic.title,
          subscriberCount: topic.subscriberCount,
        },
        editionId: item.editionId,
        editionAt: edition.scheduledAt ?? new Date(),
      });
    }

    return result;
  }

  /**
   * 从数据库获取 Featured Feed
   */
  private async getFeaturedFeedFromDb(
    limit: number,
  ): Promise<DiscoverFeedItem[]> {
    const topics = await this.prisma.digestTopic.findMany({
      where: {
        featured: true,
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      },
      orderBy: { featuredOrder: 'asc' },
      take: MAX_TOPICS_PER_FEED,
      select: {
        id: true,
        slug: true,
        title: true,
        subscriberCount: true,
      },
    });

    return this.getFeedFromDb(topics, limit);
  }

  /**
   * 从数据库获取 Trending Feed
   */
  private async getTrendingFeedFromDb(
    limit: number,
  ): Promise<DiscoverFeedItem[]> {
    const topics = await this.prisma.digestTopic.findMany({
      where: {
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        lastEditionAt: { not: null },
      },
      orderBy: [{ subscriberCount: 'desc' }, { lastEditionAt: 'desc' }],
      take: MAX_TOPICS_PER_FEED,
      select: {
        id: true,
        slug: true,
        title: true,
        subscriberCount: true,
      },
    });

    return this.getFeedFromDb(topics, limit);
  }
}
