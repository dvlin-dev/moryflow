/**
 * Digest Subscription Service
 *
 * [INPUT]: CreateSubscriptionInput, UpdateSubscriptionInput, userId
 * [OUTPUT]: DigestSubscription CRUD 操作结果
 * [POS]: 订阅管理核心服务，被 Console/Public Controller 调用
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SUBSCRIPTION_LIMITS } from '../digest.constants';
import type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ListSubscriptionsQuery,
} from '../dto';
import type { DigestSubscription } from '../../../generated/prisma-main/client';

@Injectable()
export class DigestSubscriptionService {
  private readonly logger = new Logger(DigestSubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建订阅
   */
  async create(
    userId: string,
    input: CreateSubscriptionInput,
  ): Promise<DigestSubscription> {
    // 1. 检查订阅数量限制
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscription: { select: { tier: true } },
        _count: { select: { digestSubscriptions: true } },
      },
    });

    const tier = user?.subscription?.tier || 'FREE';
    const limits = SUBSCRIPTION_LIMITS[tier];
    const currentCount = user?._count?.digestSubscriptions || 0;

    if (currentCount >= limits.maxSubscriptions) {
      throw new Error(
        `Subscription limit reached. Max ${limits.maxSubscriptions} for ${tier} tier.`,
      );
    }

    // 2. 创建订阅
    const subscription = await this.prisma.digestSubscription.create({
      data: {
        userId,
        name: input.name,
        topic: input.topic,
        interests: input.interests,
        searchLimit: input.searchLimit,
        scrapeLimit: input.scrapeLimit,
        minItems: input.minItems,
        minScore: input.minScore,
        redeliveryPolicy: input.redeliveryPolicy,
        redeliveryCooldownDays: input.redeliveryCooldownDays,
        languageMode: input.languageMode,
        outputLocale: input.outputLocale,
        cron: input.cron,
        timezone: input.timezone,
        enabled: true,
      },
    });

    this.logger.log(
      `Created subscription ${subscription.id} for user ${userId}`,
    );

    return subscription;
  }

  /**
   * 更新订阅
   */
  async update(
    userId: string,
    subscriptionId: string,
    input: UpdateSubscriptionInput,
  ): Promise<DigestSubscription> {
    // 验证所有权
    const existing = await this.prisma.digestSubscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    const subscription = await this.prisma.digestSubscription.update({
      where: { id: subscriptionId },
      data: {
        name: input.name,
        topic: input.topic,
        interests: input.interests,
        searchLimit: input.searchLimit,
        scrapeLimit: input.scrapeLimit,
        minItems: input.minItems,
        minScore: input.minScore,
        redeliveryPolicy: input.redeliveryPolicy,
        redeliveryCooldownDays: input.redeliveryCooldownDays,
        languageMode: input.languageMode,
        outputLocale: input.outputLocale,
        cron: input.cron,
        timezone: input.timezone,
        enabled: input.enabled,
      },
    });

    this.logger.log(`Updated subscription ${subscriptionId}`);

    return subscription;
  }

  /**
   * 删除订阅（软删除）
   */
  async delete(userId: string, subscriptionId: string): Promise<void> {
    const existing = await this.prisma.digestSubscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    await this.prisma.digestSubscription.update({
      where: { id: subscriptionId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Soft deleted subscription ${subscriptionId}`);
  }

  /**
   * 获取单个订阅
   */
  async findOne(
    userId: string,
    subscriptionId: string,
  ): Promise<DigestSubscription | null> {
    return this.prisma.digestSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
        deletedAt: null,
      },
    });
  }

  /**
   * 获取用户订阅列表
   */
  async findMany(
    userId: string,
    query: ListSubscriptionsQuery,
  ): Promise<{ items: DigestSubscription[]; nextCursor: string | null }> {
    const { cursor, limit, enabled } = query;

    const items = await this.prisma.digestSubscription.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(enabled !== undefined && { enabled }),
      },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
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
   * 暂停/恢复订阅
   */
  async toggleEnabled(
    userId: string,
    subscriptionId: string,
    enabled: boolean,
  ): Promise<DigestSubscription> {
    const existing = await this.prisma.digestSubscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    return this.prisma.digestSubscription.update({
      where: { id: subscriptionId },
      data: { enabled },
    });
  }

  /**
   * 获取需要调度的订阅（内部使用）
   */
  async findSubscriptionsToSchedule(): Promise<DigestSubscription[]> {
    // 查找所有激活的、未删除的、到达调度时间的订阅
    return this.prisma.digestSubscription.findMany({
      where: {
        enabled: true,
        deletedAt: null,
        // nextRunAt 小于等于当前时间
        nextRunAt: { lte: new Date() },
      },
      take: 100, // 批量处理
    });
  }

  /**
   * 更新下次运行时间
   */
  async updateNextRunAt(
    subscriptionId: string,
    nextRunAt: Date,
  ): Promise<void> {
    await this.prisma.digestSubscription.update({
      where: { id: subscriptionId },
      data: { nextRunAt },
    });
  }

  /**
   * 格式化订阅为 API 响应
   */
  toResponse(subscription: DigestSubscription) {
    return {
      id: subscription.id,
      name: subscription.name,
      topic: subscription.topic,
      interests: subscription.interests,
      searchLimit: subscription.searchLimit,
      scrapeLimit: subscription.scrapeLimit,
      minItems: subscription.minItems,
      minScore: subscription.minScore,
      redeliveryPolicy: subscription.redeliveryPolicy,
      redeliveryCooldownDays: subscription.redeliveryCooldownDays,
      languageMode: subscription.languageMode,
      outputLocale: subscription.outputLocale,
      cron: subscription.cron,
      timezone: subscription.timezone,
      enabled: subscription.enabled,
      lastRunAt: subscription.lastRunAt,
      nextRunAt: subscription.nextRunAt,
      followedTopicId: subscription.followedTopicId,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }
}
