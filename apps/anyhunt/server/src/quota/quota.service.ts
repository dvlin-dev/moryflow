/**
 * [INPUT]: userId, 配额操作请求
 * [OUTPUT]: QuotaStatus, DeductResult, RefundResult
 * [POS]: 配额业务逻辑层，协调 Repository 和 Redis，实现配额规则
 *        退款幂等通过 referenceId；失败时回滚 daily credits
 *        返还不足时补查 referenceId，确保重复请求返回 DuplicateRefundError
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-main/client';
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
  getDailyCreditsByTier,
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
  InvalidQuotaAmountError,
  InvalidPurchaseError,
  ConcurrentLimitExceededError,
  RateLimitExceededError,
  DuplicatePurchaseError,
} from './quota.errors';
import { DailyCreditsService } from './daily-credits.service';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly repository: QuotaRepository,
    private readonly redis: RedisService,
    private readonly dailyCredits: DailyCreditsService,
  ) {}

  private assertPositiveInteger(amount: number, reason?: string): number {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new InvalidQuotaAmountError(amount, reason);
    }
    return amount;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  // ============ 查询操作 ============

  /**
   * 获取用户配额状态
   * 自动检查并处理周期重置
   */
  async getStatus(userId: string): Promise<QuotaStatus> {
    // 先检查周期是否需要重置
    await this.checkAndResetPeriodIfNeeded(userId);

    const tier = await this.repository.getUserTier(userId);
    const dailyLimit = getDailyCreditsByTier(tier);
    const dailyStatus = await this.dailyCredits.getStatus(
      userId,
      dailyLimit,
      new Date(),
    );

    const quota = await this.repository.findByUserId(userId);
    if (!quota) {
      throw new QuotaNotFoundError(userId);
    }

    const monthlyRemaining = Math.max(
      0,
      quota.monthlyLimit - quota.monthlyUsed,
    );

    return {
      daily: {
        limit: dailyStatus.limit,
        used: dailyStatus.used,
        remaining: dailyStatus.remaining,
        resetsAt: dailyStatus.resetsAt,
      },
      monthly: {
        limit: quota.monthlyLimit,
        used: quota.monthlyUsed,
        remaining: monthlyRemaining,
      },
      purchased: quota.purchasedQuota,
      totalRemaining:
        dailyStatus.remaining + monthlyRemaining + quota.purchasedQuota,
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
    const normalizedAmount = this.assertPositiveInteger(
      amount,
      'deduct amount must be a positive integer',
    );

    // 先检查周期是否需要重置
    await this.checkAndResetPeriodIfNeeded(userId);

    const tier = await this.repository.getUserTier(userId);
    const dailyLimit = getDailyCreditsByTier(tier);
    const now = new Date();
    const dailyStatus = await this.dailyCredits.getStatus(
      userId,
      dailyLimit,
      now,
    );

    const quota = await this.repository.findByUserId(userId);
    if (!quota) {
      throw new QuotaNotFoundError(userId);
    }

    const monthlyRemaining = quota.monthlyLimit - quota.monthlyUsed;
    const totalAvailable =
      dailyStatus.remaining + monthlyRemaining + quota.purchasedQuota;

    // 配额不足
    if (totalAvailable < normalizedAmount) {
      return {
        success: false,
        available: totalAvailable,
        required: normalizedAmount,
      };
    }

    let remaining = normalizedAmount;
    const breakdown: DeductResult['breakdown'] = [];
    let dailyTransactionId: string | null = null;
    let dailyConsumed = 0;

    // 1) Daily credits（FREE）优先
    if (dailyStatus.remaining > 0 && remaining > 0) {
      const dailyToConsume = Math.min(dailyStatus.remaining, remaining);
      const consumed = await this.dailyCredits.consume(
        userId,
        dailyLimit,
        dailyToConsume,
        now,
      );

      if (consumed.consumed > 0) {
        const tx = await this.repository.createTransaction({
          userId,
          type: 'DEDUCT',
          source: 'DAILY',
          amount: consumed.consumed,
          balanceBefore: consumed.balanceBefore,
          balanceAfter: consumed.balanceAfter,
          reason,
        });

        dailyTransactionId = tx.id;
        dailyConsumed = consumed.consumed;

        breakdown.push({
          source: 'DAILY',
          amount: consumed.consumed,
          transactionId: tx.id,
          balanceBefore: consumed.balanceBefore,
          balanceAfter: consumed.balanceAfter,
        });

        remaining -= consumed.consumed;
      }
    }

    // 2) Monthly credits
    if (remaining > 0 && monthlyRemaining > 0) {
      const monthlyToConsume = Math.min(monthlyRemaining, remaining);
      if (monthlyToConsume > 0) {
        const result = await this.repository.deductMonthlyInTransaction(
          userId,
          monthlyToConsume,
          reason,
        );
        if (!result) {
          this.logger.warn(
            `Monthly deduct failed due to concurrent update. user=${userId}`,
          );
        } else {
          breakdown.push({
            source: 'MONTHLY',
            amount: monthlyToConsume,
            transactionId: result.transaction.id,
            balanceBefore: result.transaction.balanceBefore,
            balanceAfter: result.transaction.balanceAfter,
          });
          remaining -= monthlyToConsume;
        }
      }
    }

    // 3) Purchased credits
    if (remaining > 0) {
      const purchasedToConsume = Math.min(quota.purchasedQuota, remaining);
      if (purchasedToConsume > 0) {
        const result = await this.repository.deductPurchasedInTransaction(
          userId,
          purchasedToConsume,
          reason,
        );
        if (!result) {
          this.logger.warn(
            `Purchased deduct failed due to concurrent update. user=${userId}`,
          );
        } else {
          breakdown.push({
            source: 'PURCHASED',
            amount: purchasedToConsume,
            transactionId: result.transaction.id,
            balanceBefore: result.transaction.balanceBefore,
            balanceAfter: result.transaction.balanceAfter,
          });
          remaining -= purchasedToConsume;
        }
      }
    }

    if (remaining > 0) {
      this.logger.warn(
        `Deduct race detected: requested=${normalizedAmount}, remaining=${remaining}, user=${userId}`,
      );
      let available = totalAvailable - (normalizedAmount - remaining);
      if (dailyTransactionId && dailyConsumed > 0) {
        await this.rollbackDailyConsumption({
          userId,
          referenceId: `rollback:${dailyTransactionId}`,
          deductTransactionId: dailyTransactionId,
          amount: dailyConsumed,
        });
        const status = await this.getStatus(userId);
        available = status.totalRemaining;
      }
      return {
        success: false,
        available,
        required: normalizedAmount,
      };
    }

    return { success: true, breakdown };
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
   * 幂等操作：同一 referenceId 只能返还一次
   *
   * @param params 返还参数
   * @returns 返还结果
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    const { userId, referenceId, source, amount } = params;
    const normalizedReferenceId = referenceId.trim();

    // 幂等性检查：是否已返还
    if (!normalizedReferenceId) {
      throw new InvalidRefundError('referenceId is required');
    }

    // 验证参数
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new InvalidRefundError('Amount must be a positive integer');
    }

    try {
      if (source === 'DAILY') {
        const dailyLimit = getDailyCreditsByTier('FREE');
        const deductTxId = params.deductTransactionId;
        if (!deductTxId) {
          throw new InvalidRefundError(
            'deductTransactionId is required for DAILY',
          );
        }

        const deductTx = await this.repository.findTransactionById(deductTxId);
        if (!deductTx) {
          throw new InvalidRefundError('Deduct transaction not found');
        }
        if (deductTx.type !== 'DEDUCT' || deductTx.source !== 'DAILY') {
          throw new InvalidRefundError(
            'deductTransactionId must reference DAILY deduct transaction',
          );
        }

        const refunded = await this.dailyCredits.refundOnce(
          userId,
          dailyLimit,
          amount,
          deductTx.createdAt,
          normalizedReferenceId,
          new Date(),
        );
        if (refunded.duplicated) {
          throw new DuplicateRefundError(normalizedReferenceId);
        }

        const refundTx = await this.repository.createTransaction({
          userId,
          type: 'REFUND',
          source: 'DAILY',
          amount: refunded.refunded,
          balanceBefore: refunded.balanceBefore,
          balanceAfter: refunded.balanceAfter,
          reason: normalizedReferenceId,
          referenceId: normalizedReferenceId,
        });

        this.logger.log(
          `Refunded ${refunded.refunded}/${amount} to DAILY credits for user ${userId}, reference ${normalizedReferenceId}`,
        );

        return {
          success: true,
          transactionId: refundTx.id,
          balanceBefore: refunded.balanceBefore,
          balanceAfter: refunded.balanceAfter,
        };
      }

      const result = await this.repository.refundInTransaction(
        userId,
        amount,
        source,
        normalizedReferenceId,
        normalizedReferenceId,
      );
      if (!result) {
        const existingRefund = await this.repository.findRefundByReferenceId(
          userId,
          normalizedReferenceId,
        );
        if (existingRefund) {
          throw new DuplicateRefundError(normalizedReferenceId);
        }
        throw new InvalidRefundError('Quota not found or insufficient usage');
      }

      this.logger.log(
        `Refunded ${amount} to ${source} quota for user ${userId}, reference ${normalizedReferenceId}`,
      );

      return {
        success: true,
        transactionId: result.transaction.id,
        balanceBefore: result.transaction.balanceBefore,
        balanceAfter: result.transaction.balanceAfter,
      };
    } catch (error) {
      if (error instanceof DuplicateRefundError) {
        throw error;
      }
      if (error instanceof InvalidRefundError) {
        throw error;
      }
      if (this.isUniqueConstraintError(error)) {
        throw new DuplicateRefundError(normalizedReferenceId);
      }
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
    const normalizedAmount = this.assertPositiveInteger(
      amount,
      'purchase amount must be a positive integer',
    );
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      throw new InvalidPurchaseError('orderId is required');
    }

    try {
      const result = await this.repository.addPurchasedInTransaction(
        userId,
        normalizedAmount,
        normalizedOrderId,
      );

      this.logger.log(
        `Added ${normalizedAmount} purchased quota for user ${userId}. New balance: ${result.quota.purchasedQuota}`,
      );
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new DuplicatePurchaseError(normalizedOrderId);
      }
      throw error;
    }
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

  private async rollbackDailyConsumption(params: {
    userId: string;
    referenceId: string;
    deductTransactionId: string;
    amount: number;
  }): Promise<void> {
    try {
      const result = await this.refund({
        userId: params.userId,
        referenceId: params.referenceId,
        deductTransactionId: params.deductTransactionId,
        source: 'DAILY',
        amount: params.amount,
      });
      if (!result.success) {
        this.logger.warn(
          `Failed to rollback daily credits for user ${params.userId}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Rollback daily credits failed for user ${params.userId}: ${(error as Error).message}`,
      );
    }
  }
}
