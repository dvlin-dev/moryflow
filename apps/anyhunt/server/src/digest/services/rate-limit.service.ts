/**
 * Digest Rate Limit Service
 *
 * [INPUT]: 用户 ID, 操作类型
 * [OUTPUT]: 限流检查结果
 * [POS]: 反 spam 每日操作限流服务
 */

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ANTI_SPAM_LIMITS, SUBSCRIPTION_LIMITS } from '../digest.constants';
import type { SubscriptionTier } from '../../../generated/prisma-main/client';
import { getEffectiveSubscriptionTier } from '../../common/utils/subscription-tier';

export type TopicOperation = 'create' | 'update';

@Injectable()
export class DigestRateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取今天的日期字符串（YYYY-MM-DD）
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 获取用户今日操作记录
   */
  private async getDailyOps(userId: string) {
    const today = this.getTodayDate();

    return this.prisma.digestUserDailyOps.findUnique({
      where: {
        userId_date: { userId, date: today },
      },
    });
  }

  /**
   * 获取用户订阅等级
   */
  private async getUserTier(userId: string): Promise<SubscriptionTier> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: { select: { tier: true, status: true } } },
    });

    return getEffectiveSubscriptionTier(user?.subscription, 'FREE');
  }

  /**
   * 检查用户是否可以执行 PUBLIC topic 操作
   * @throws ForbiddenException 如果超出限制
   */
  async checkTopicOperation(
    userId: string,
    operation: TopicOperation,
  ): Promise<void> {
    const tier = await this.getUserTier(userId);

    // 付费用户不受每日操作限制
    if (tier !== 'FREE') {
      return;
    }

    const dailyOps = await this.getDailyOps(userId);
    const totalOps =
      (dailyOps?.topicCreates || 0) + (dailyOps?.topicUpdates || 0);

    if (totalOps >= ANTI_SPAM_LIMITS.freeUserDailyTopicOps) {
      throw new ForbiddenException(
        `Daily public topic operation limit reached. Free users can ${operation} up to ${ANTI_SPAM_LIMITS.freeUserDailyTopicOps} public topics per day. Upgrade to increase limits.`,
      );
    }
  }

  /**
   * 检查用户 PUBLIC topic 数量限制
   * @throws ForbiddenException 如果超出限制
   */
  async checkPublicTopicCount(userId: string): Promise<void> {
    const tier = await this.getUserTier(userId);
    const limits = SUBSCRIPTION_LIMITS[tier];

    const currentCount = await this.prisma.digestTopic.count({
      where: {
        createdByUserId: userId,
        visibility: 'PUBLIC',
      },
    });

    if (currentCount >= limits.maxPublicTopics) {
      throw new ForbiddenException(
        `Public topic limit reached. Max ${limits.maxPublicTopics} for ${tier} tier. Upgrade to increase limits.`,
      );
    }
  }

  /**
   * 记录 PUBLIC topic 操作
   */
  async recordTopicOperation(
    userId: string,
    operation: TopicOperation,
  ): Promise<void> {
    const today = this.getTodayDate();

    await this.prisma.digestUserDailyOps.upsert({
      where: {
        userId_date: { userId, date: today },
      },
      create: {
        userId,
        date: today,
        topicCreates: operation === 'create' ? 1 : 0,
        topicUpdates: operation === 'update' ? 1 : 0,
      },
      update: {
        topicCreates: operation === 'create' ? { increment: 1 } : undefined,
        topicUpdates: operation === 'update' ? { increment: 1 } : undefined,
      },
    });
  }

  /**
   * 获取用户今日剩余操作次数
   */
  async getRemainingOperations(userId: string): Promise<{
    remaining: number;
    limit: number;
    isUnlimited: boolean;
  }> {
    const tier = await this.getUserTier(userId);

    // 付费用户不受限制
    if (tier !== 'FREE') {
      return {
        remaining: -1,
        limit: -1,
        isUnlimited: true,
      };
    }

    const dailyOps = await this.getDailyOps(userId);
    const totalOps =
      (dailyOps?.topicCreates || 0) + (dailyOps?.topicUpdates || 0);
    const limit = ANTI_SPAM_LIMITS.freeUserDailyTopicOps;

    return {
      remaining: Math.max(0, limit - totalOps),
      limit,
      isUnlimited: false,
    };
  }
}
