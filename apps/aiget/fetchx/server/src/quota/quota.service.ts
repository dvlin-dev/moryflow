/**
 * [INPUT]: userId, 配额操作请求
 * [OUTPUT]: QuotaStatus, DeductResult, RefundResult
 * [POS]: 配额业务逻辑层，协调 Repository 和 Redis，实现配额规则
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { QuotaRepository } from './quota.repository';
import { RedisService } from '../redis/redis.service';
import type { SubscriptionTier } from '../types/tier.types';
import type {
  QuotaStatus,
  DeductQuotaResult,
  DeductResult,
  RefundParams,
  RefundResult,
  InitQuotaParams,
  AddPurchasedQuotaParams,
  PeriodResetResult,
} from './quota.types';
import {
  getMonthlyQuotaByTier,
  getTierConfig,
  DEFAULT_TIER,
  type TierQuotaConfig,
} from './quota.constants';
import {
  QuotaNotFoundError,
  QuotaAlreadyExistsError,
  QuotaExceededError,
  DuplicateRefundError,
  InvalidRefundError,
  ConcurrentLimitExceededError,
  RateLimitExceededError,
} from './quota.errors';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly repository: QuotaRepository,
    private readonly redis: RedisService,
  ) {}

  // ============ 查询操作 ============

  /**
   * 获取用户配额状态
   * 自动检查并处理周期重置
   */
  async getStatus(userId: string): Promise<QuotaStatus> {
    // 先检查周期是否需要重置
    await this.checkAndResetPeriodIfNeeded(userId);

    const quota = await this.repository.findByUserId(userId);
    if (!quota) {
      throw new QuotaNotFoundError(userId);
    }

    const monthlyRemaining = Math.max(
      0,
      quota.monthlyLimit - quota.monthlyUsed,
    );

    return {
      monthly: {
        limit: quota.monthlyLimit,
        used: quota.monthlyUsed,
        remaining: monthlyRemaining,
      },
      purchased: quota.purchasedQuota,
      totalRemaining: monthlyRemaining + quota.purchasedQuota,
      periodEndsAt: quota.periodEndAt,
      periodStartsAt: quota.periodStartAt,
    };
  }

  /**
   * 检查配额是否充足（不扣减）
   */
  async checkAvailable(userId: string, required: number = 1): Promise<boolean> {
    const status = await this.getStatus(userId);
    return status.totalRemaining >= required;
  }

  // ============ 配额扣减 ============

  /**
   * 预扣配额
   * 优先扣月度配额，不足时扣购买配额
   *
   * @param userId 用户 ID
   * @param amount 扣减数量（默认 1）
   * @param reason 扣减原因（通常是 screenshot ID）
   * @returns 扣减结果
   * @throws QuotaNotFoundError 配额记录不存在
   * @throws QuotaExceededError 配额不足（仅当 throwOnInsufficient=true）
   */
  async deduct(
    userId: string,
    amount: number = 1,
    reason?: string,
  ): Promise<DeductQuotaResult> {
    // 先检查周期是否需要重置
    await this.checkAndResetPeriodIfNeeded(userId);

    const quota = await this.repository.findByUserId(userId);
    if (!quota) {
      throw new QuotaNotFoundError(userId);
    }

    const monthlyRemaining = quota.monthlyLimit - quota.monthlyUsed;
    const totalAvailable = monthlyRemaining + quota.purchasedQuota;

    // 配额不足
    if (totalAvailable < amount) {
      return {
        success: false,
        available: totalAvailable,
        required: amount,
      };
    }

    // 决定扣减来源
    if (monthlyRemaining >= amount) {
      // 从月度配额扣减
      const result = await this.repository.deductMonthlyInTransaction(
        userId,
        amount,
        reason,
      );

      this.logger.debug(
        `Deducted ${amount} from monthly quota for user ${userId}. Remaining: ${result.quota.monthlyLimit - result.quota.monthlyUsed}`,
      );

      return {
        success: true,
        source: 'MONTHLY',
        balanceBefore: result.transaction.balanceBefore,
        balanceAfter: result.transaction.balanceAfter,
        transactionId: result.transaction.id,
      };
    } else {
      // 从购买配额扣减
      const result = await this.repository.deductPurchasedInTransaction(
        userId,
        amount,
        reason,
      );

      this.logger.debug(
        `Deducted ${amount} from purchased quota for user ${userId}. Remaining: ${result.quota.purchasedQuota}`,
      );

      return {
        success: true,
        source: 'PURCHASED',
        balanceBefore: result.transaction.balanceBefore,
        balanceAfter: result.transaction.balanceAfter,
        transactionId: result.transaction.id,
      };
    }
  }

  /**
   * 预扣配额（失败时抛出异常）
   */
  async deductOrThrow(
    userId: string,
    amount: number = 1,
    reason?: string,
  ): Promise<DeductResult> {
    const result = await this.deduct(userId, amount, reason);

    if (!result.success) {
      throw new QuotaExceededError(result.available, result.required);
    }

    return result;
  }

  // ============ 配额返还 ============

  /**
   * 返还配额
   * 幂等操作：同一 screenshotId 只能返还一次
   *
   * @param params 返还参数
   * @returns 返还结果
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    const { userId, screenshotId, source, amount } = params;

    // 幂等性检查：是否已返还
    const hasRefund = await this.repository.hasRefundForScreenshot(
      userId,
      screenshotId,
    );
    if (hasRefund) {
      this.logger.warn(
        `Duplicate refund attempt for screenshot ${screenshotId}, user ${userId}`,
      );
      throw new DuplicateRefundError(screenshotId);
    }

    // 验证参数
    if (amount <= 0) {
      throw new InvalidRefundError('Amount must be positive');
    }

    try {
      const result = await this.repository.refundInTransaction(
        userId,
        amount,
        source,
        screenshotId,
      );

      this.logger.log(
        `Refunded ${amount} to ${source} quota for user ${userId}, screenshot ${screenshotId}`,
      );

      return {
        success: true,
        transactionId: result.transaction.id,
        balanceBefore: result.transaction.balanceBefore,
        balanceAfter: result.transaction.balanceAfter,
      };
    } catch (error) {
      this.logger.error(
        `Failed to refund quota for user ${userId}: ${(error as Error).message}`,
      );
      return { success: false };
    }
  }

  // ============ 配额初始化 ============

  /**
   * 初始化用户配额（用户注册时调用）
   */
  async initialize(params: InitQuotaParams): Promise<void> {
    const { userId, monthlyLimit } = params;

    const exists = await this.repository.exists(userId);
    if (exists) {
      throw new QuotaAlreadyExistsError(userId);
    }

    const quota = await this.repository.create(userId, monthlyLimit);

    this.logger.log(
      `Initialized quota for user ${userId}: monthlyLimit=${quota.monthlyLimit}`,
    );
  }

  /**
   * 确保用户有配额记录（如果不存在则创建）
   */
  async ensureExists(
    userId: string,
    tier: SubscriptionTier = DEFAULT_TIER,
  ): Promise<void> {
    const exists = await this.repository.exists(userId);
    if (!exists) {
      const monthlyLimit = getMonthlyQuotaByTier(tier);
      await this.repository.create(userId, monthlyLimit);
      this.logger.log(`Created quota for user ${userId}: tier=${tier}`);
    }
  }

  // ============ 配额购买 ============

  /**
   * 增加购买配额
   */
  async addPurchased(params: AddPurchasedQuotaParams): Promise<void> {
    const { userId, amount, orderId } = params;

    const result = await this.repository.addPurchasedInTransaction(
      userId,
      amount,
      orderId,
    );

    this.logger.log(
      `Added ${amount} purchased quota for user ${userId}. New balance: ${result.quota.purchasedQuota}`,
    );
  }

  // ============ 套餐变更 ============

  /**
   * 更新月度配额上限（套餐变更时调用）
   */
  async updateMonthlyLimit(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<void> {
    const monthlyLimit = getMonthlyQuotaByTier(tier);
    await this.repository.updateMonthlyLimit(userId, monthlyLimit);

    this.logger.log(
      `Updated monthly limit for user ${userId}: tier=${tier}, limit=${monthlyLimit}`,
    );
  }

  // ============ 周期管理 ============

  /**
   * 检查并重置周期（如果需要）
   */
  async checkAndResetPeriodIfNeeded(
    userId: string,
  ): Promise<PeriodResetResult> {
    const quota = await this.repository.findByUserId(userId);
    if (!quota) {
      return { wasReset: false };
    }

    const now = new Date();
    if (now < quota.periodEndAt) {
      return { wasReset: false };
    }

    // 周期已过期，执行重置
    const result = await this.repository.resetPeriodInTransaction(userId);

    this.logger.log(
      `Reset period for user ${userId}. Previous used: ${result.previousUsed}`,
    );

    return {
      wasReset: true,
      previousUsed: result.previousUsed,
      newPeriodEnd: result.quota.periodEndAt,
    };
  }

  // ============ 并发控制 ============

  /**
   * 检查并增加并发计数
   * @returns 当前并发数
   * @throws ConcurrentLimitExceededError 超过限制
   */
  async incrementConcurrent(
    userId: string,
    tier: SubscriptionTier,
  ): Promise<number> {
    const config = getTierConfig(tier);

    // incrementConcurrent 第二个参数是 TTL（秒），这里使用 120 秒作为并发计数的过期时间
    const current = await this.redis.incrementConcurrent(userId, 120);

    if (current > config.maxConcurrent) {
      // 超限，回滚
      await this.redis.decrementConcurrent(userId);
      throw new ConcurrentLimitExceededError(config.maxConcurrent, current - 1);
    }

    return current;
  }

  /**
   * 减少并发计数
   */
  async decrementConcurrent(userId: string): Promise<void> {
    await this.redis.decrementConcurrent(userId);
  }

  // ============ 频率限制 ============

  /**
   * 检查频率限制
   * @throws RateLimitExceededError 超过限制
   */
  async checkRateLimit(userId: string, tier: SubscriptionTier): Promise<void> {
    const config = getTierConfig(tier);
    // checkRateLimit 参数: (userId, windowSeconds, limit)
    const result = await this.redis.checkRateLimit(
      userId,
      60,
      config.ratePerMinute,
    );

    if (!result.allowed) {
      throw new RateLimitExceededError(config.ratePerMinute, 'minute');
    }
  }

  // ============ 功能权限检查 ============

  /**
   * 检查功能是否可用
   */
  isFeatureAllowed(
    tier: SubscriptionTier,
    feature: keyof TierQuotaConfig['features'],
  ): boolean {
    const config = getTierConfig(tier);
    return config.features[feature] ?? false;
  }

  /**
   * 获取套餐限制配置
   */
  getTierLimits(tier: SubscriptionTier): TierQuotaConfig {
    return getTierConfig(tier);
  }
}
