/**
 * [INPUT]: userId / apiKeyId
 * [OUTPUT]: QuotaCheckResult
 * [POS]: 配额检查服务
 *
 * 职责：只负责检查配额是否允许操作，不做用量记录
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService, SubscriptionTier } from '../subscription';
import { getTierLimits, type TierLimits } from './quota.constants';

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * 检查 Memory 配额
   */
  async checkMemoryQuota(
    apiKeyId: string,
    quantity: number = 1,
  ): Promise<QuotaCheckResult> {
    const tier = await this.subscriptionService.getTierByApiKey(apiKeyId);
    const limits = getTierLimits(tier);

    // 无限制
    if (limits.memories === -1) {
      return { allowed: true };
    }

    const currentCount = await this.getMemoryCount(apiKeyId);
    if (currentCount + quantity > limits.memories) {
      return {
        allowed: false,
        reason: `Memory limit reached (${limits.memories})`,
      };
    }

    return { allowed: true };
  }

  /**
   * 检查 API 调用配额
   */
  async checkApiQuota(apiKeyId: string): Promise<QuotaCheckResult> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { userId: true },
    });

    if (!apiKey) {
      return { allowed: false, reason: 'API Key not found' };
    }

    const tier = await this.subscriptionService.getTier(apiKey.userId);
    const limits = getTierLimits(tier);

    // 无限制
    if (limits.monthlyApiCalls === -1) {
      return { allowed: true };
    }

    const quota = await this.getQuota(apiKey.userId);
    if (!quota) {
      // 如果没有配额记录，创建一个
      await this.ensureQuotaExists(apiKey.userId);
      return { allowed: true };
    }

    if (quota.monthlyApiUsed >= limits.monthlyApiCalls) {
      return {
        allowed: false,
        reason: `Monthly API call limit reached (${limits.monthlyApiCalls})`,
      };
    }

    return { allowed: true };
  }

  /**
   * 增加 API 使用计数 (FREE/HOBBY 使用)
   */
  async incrementApiUsage(userId: string): Promise<void> {
    await this.prisma.quota.upsert({
      where: { userId },
      create: {
        userId,
        monthlyApiLimit: 1000,
        monthlyApiUsed: 1,
        periodEndAt: this.calculatePeriodEnd(),
      },
      update: {
        monthlyApiUsed: { increment: 1 },
      },
    });
  }

  /**
   * 增加 API 使用计数 (通过 API Key)
   */
  async incrementApiUsageByApiKey(apiKeyId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { userId: true },
    });

    if (apiKey) {
      await this.incrementApiUsage(apiKey.userId);
    }
  }

  /**
   * 获取配额状态
   */
  async getQuotaStatus(userId: string): Promise<{
    tier: SubscriptionTier;
    limits: TierLimits;
    usage: {
      memories: number;
      apiCalls: number;
    };
  }> {
    const tier = await this.subscriptionService.getTier(userId);
    const limits = getTierLimits(tier);

    // 获取用户的所有 API Key
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: { id: true },
    });

    // 统计所有 API Key 下的 Memory 数量
    const memoryCount = await this.prisma.memory.count({
      where: {
        apiKeyId: { in: apiKeys.map((k) => k.id) },
      },
    });

    const quota = await this.getQuota(userId);

    return {
      tier,
      limits,
      usage: {
        memories: memoryCount,
        apiCalls: quota?.monthlyApiUsed ?? 0,
      },
    };
  }

  /**
   * 确保用户有配额记录
   */
  async ensureQuotaExists(userId: string): Promise<void> {
    const exists = await this.prisma.quota.findUnique({
      where: { userId },
    });

    if (!exists) {
      const tier = await this.subscriptionService.getTier(userId);
      const limits = getTierLimits(tier);

      await this.prisma.quota.create({
        data: {
          userId,
          monthlyApiLimit: limits.monthlyApiCalls,
          monthlyApiUsed: 0,
          periodEndAt: this.calculatePeriodEnd(),
        },
      });

      this.logger.log(`Created quota for user ${userId}`);
    }
  }

  /**
   * 重置月度配额 (定时任务调用)
   */
  async resetMonthlyQuota(userId: string): Promise<void> {
    await this.prisma.quota.update({
      where: { userId },
      data: {
        monthlyApiUsed: 0,
        periodStartAt: new Date(),
        periodEndAt: this.calculatePeriodEnd(),
      },
    });

    this.logger.log(`Reset monthly quota for user ${userId}`);
  }

  // ============ Private Methods ============

  private async getMemoryCount(apiKeyId: string): Promise<number> {
    return this.prisma.memory.count({
      where: { apiKeyId },
    });
  }

  private async getQuota(userId: string) {
    return this.prisma.quota.findUnique({
      where: { userId },
    });
  }

  private calculatePeriodEnd(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1); // 下个月1号
  }
}
