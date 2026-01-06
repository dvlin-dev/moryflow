/**
 * [INPUT]: userId
 * [OUTPUT]: Subscription, SubscriptionTier
 * [POS]: 订阅业务逻辑层，管理用户订阅状态
 *
 * 职责：只负责获取和管理用户订阅状态
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionTier, DEFAULT_TIER } from './subscription.constants';
import type { Subscription } from '../../generated/prisma/client';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户订阅记录
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findUnique({
      where: { userId },
    });
  }

  /**
   * 获取用户订阅层级
   * 如果用户没有订阅记录，返回 FREE
   */
  async getTier(userId: string): Promise<SubscriptionTier> {
    const sub = await this.getSubscription(userId);
    return (sub?.tier as SubscriptionTier) ?? DEFAULT_TIER;
  }

  /**
   * 通过 API Key 获取订阅层级
   */
  async getTierByApiKey(apiKeyId: string): Promise<SubscriptionTier> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { userId: true },
    });

    if (!apiKey) {
      return DEFAULT_TIER;
    }

    return this.getTier(apiKey.userId);
  }

  /**
   * 检查用户是否为 Enterprise
   */
  async isEnterprise(userId: string): Promise<boolean> {
    const tier = await this.getTier(userId);
    return tier === SubscriptionTier.ENTERPRISE;
  }

  /**
   * 通过 API Key 检查是否为 Enterprise
   */
  async isEnterpriseByApiKey(apiKeyId: string): Promise<boolean> {
    const tier = await this.getTierByApiKey(apiKeyId);
    return tier === SubscriptionTier.ENTERPRISE;
  }

  /**
   * 确保用户有订阅记录（如果不存在则创建）
   */
  async ensureExists(userId: string): Promise<Subscription> {
    let subscription = await this.getSubscription(userId);

    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: {
          userId,
          tier: DEFAULT_TIER,
        },
      });
      this.logger.log(`Created subscription for user ${userId}: tier=${DEFAULT_TIER}`);
    }

    return subscription;
  }

  /**
   * 更新订阅层级
   */
  async updateTier(userId: string, tier: SubscriptionTier): Promise<Subscription> {
    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
      },
      update: {
        tier,
      },
    });

    this.logger.log(`Updated subscription for user ${userId}: tier=${tier}`);
    return subscription;
  }
}
