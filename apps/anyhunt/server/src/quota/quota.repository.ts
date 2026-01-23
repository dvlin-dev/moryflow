/**
 * [INPUT]: userId, 配额操作参数
 * [OUTPUT]: Quota 实体, QuotaTransaction 记录
 * [POS]: 配额数据访问层，封装 Prisma 操作，不含业务逻辑
 *        扣减/返还使用条件更新，避免超扣与负数
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  Quota,
  QuotaTransaction,
  QuotaSource,
} from '../../generated/prisma-main/client';
import { calculatePeriodEnd, DEFAULT_MONTHLY_QUOTA } from './quota.constants';
import type { SubscriptionTier } from '../types/tier.types';
import { getEffectiveSubscriptionTier } from '../common/utils/subscription-tier';

@Injectable()
export class QuotaRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============ 查询操作 ============

  async getUserTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true, status: true },
    });
    return getEffectiveSubscriptionTier(
      subscription,
      'FREE',
    ) as SubscriptionTier;
  }

  /**
   * 根据用户 ID 查询配额记录
   */
  async findByUserId(userId: string): Promise<Quota | null> {
    return this.prisma.quota.findUnique({
      where: { userId },
    });
  }

  /**
   * 检查配额记录是否存在
   */
  async exists(userId: string): Promise<boolean> {
    const count = await this.prisma.quota.count({
      where: { userId },
    });
    return count > 0;
  }

  // ============ 创建操作 ============

  /**
   * 创建配额记录
   */
  async create(
    userId: string,
    monthlyLimit: number = DEFAULT_MONTHLY_QUOTA,
  ): Promise<Quota> {
    const now = new Date();
    return this.prisma.quota.create({
      data: {
        userId,
        monthlyLimit,
        monthlyUsed: 0,
        periodStartAt: now,
        periodEndAt: calculatePeriodEnd(now),
        purchasedQuota: 0,
      },
    });
  }

  // ============ 更新操作 ============

  /**
   * 更新月度配额上限
   */
  async updateMonthlyLimit(
    userId: string,
    monthlyLimit: number,
  ): Promise<Quota> {
    return this.prisma.quota.update({
      where: { userId },
      data: { monthlyLimit },
    });
  }

  // ============ 事务操作 ============

  /**
   * 在事务中执行配额扣减（月度配额）
   * @returns 更新后的配额 + 交易记录
   */
  async deductMonthlyInTransaction(
    userId: string,
    amount: number,
    reason?: string,
  ): Promise<{ quota: Quota; transaction: QuotaTransaction } | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Quota[]>`
        UPDATE "Quota"
        SET "monthlyUsed" = "monthlyUsed" + ${amount}
        WHERE "userId" = ${userId}
          AND "monthlyUsed" + ${amount} <= "monthlyLimit"
        RETURNING *
      `;
      const quota = rows[0];
      if (!quota) {
        return null;
      }

      const balanceAfter = quota.monthlyLimit - quota.monthlyUsed;
      const balanceBefore = balanceAfter + amount;

      // 创建交易记录
      const transaction = await tx.quotaTransaction.create({
        data: {
          userId,
          type: 'DEDUCT',
          amount,
          source: 'MONTHLY',
          balanceBefore,
          balanceAfter,
          reason,
        },
      });

      return { quota, transaction };
    });
  }

  /**
   * 在事务中执行配额扣减（购买配额）
   */
  async deductPurchasedInTransaction(
    userId: string,
    amount: number,
    reason?: string,
  ): Promise<{ quota: Quota; transaction: QuotaTransaction } | null> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Quota[]>`
        UPDATE "Quota"
        SET "purchasedQuota" = "purchasedQuota" - ${amount}
        WHERE "userId" = ${userId}
          AND "purchasedQuota" >= ${amount}
        RETURNING *
      `;
      const quota = rows[0];
      if (!quota) {
        return null;
      }

      const balanceAfter = quota.purchasedQuota;
      const balanceBefore = balanceAfter + amount;

      const transaction = await tx.quotaTransaction.create({
        data: {
          userId,
          type: 'DEDUCT',
          amount,
          source: 'PURCHASED',
          balanceBefore,
          balanceAfter,
          reason,
        },
      });

      return { quota, transaction };
    });
  }

  /**
   * 在事务中执行配额返还
   */
  async refundInTransaction(
    userId: string,
    amount: number,
    source: QuotaSource,
    reason: string,
    referenceId: string,
  ): Promise<{ quota: Quota; transaction: QuotaTransaction } | null> {
    return this.prisma.$transaction(async (tx) => {
      let quota: Quota | undefined;
      let balanceBefore: number;
      let balanceAfter: number;

      if (source === 'MONTHLY') {
        const rows = await tx.$queryRaw<Quota[]>`
          UPDATE "Quota"
          SET "monthlyUsed" = "monthlyUsed" - ${amount}
          WHERE "userId" = ${userId}
            AND "monthlyUsed" >= ${amount}
          RETURNING *
        `;
        quota = rows[0];
        if (!quota) return null;
        balanceAfter = quota.monthlyLimit - quota.monthlyUsed;
        balanceBefore = balanceAfter - amount;
      } else if (source === 'PURCHASED') {
        const rows = await tx.$queryRaw<Quota[]>`
          UPDATE "Quota"
          SET "purchasedQuota" = "purchasedQuota" + ${amount}
          WHERE "userId" = ${userId}
          RETURNING *
        `;
        quota = rows[0];
        if (!quota) return null;
        balanceAfter = quota.purchasedQuota;
        balanceBefore = balanceAfter - amount;
      } else {
        throw new Error(`Unsupported refund source: ${source}`);
      }

      const transaction = await tx.quotaTransaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount,
          source,
          balanceBefore,
          balanceAfter,
          reason,
          referenceId,
        },
      });

      return { quota, transaction };
    });
  }

  /**
   * 在事务中执行周期重置
   */
  async resetPeriodInTransaction(userId: string): Promise<{
    quota: Quota;
    transaction: QuotaTransaction | null;
    previousUsed: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.quota.findUnique({
        where: { userId },
      });

      if (!current) {
        throw new Error('Quota not found');
      }

      const previousUsed = current.monthlyUsed;
      const now = new Date();

      const quota = await tx.quota.update({
        where: { userId },
        data: {
          monthlyUsed: 0,
          periodStartAt: now,
          periodEndAt: calculatePeriodEnd(now),
        },
      });

      const transaction =
        previousUsed > 0
          ? await tx.quotaTransaction.create({
              data: {
                userId,
                type: 'RESET',
                amount: previousUsed,
                source: 'MONTHLY',
                balanceBefore: current.monthlyLimit - previousUsed,
                balanceAfter: current.monthlyLimit,
                reason: `Period reset. Previous used: ${previousUsed}`,
              },
            })
          : null;

      return { quota, transaction, previousUsed };
    });
  }

  /**
   * 在事务中添加购买配额
   */
  async addPurchasedInTransaction(
    userId: string,
    amount: number,
    orderId?: string,
  ): Promise<{ quota: Quota; transaction: QuotaTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.quota.findUnique({
        where: { userId },
      });

      if (!current) {
        throw new Error('Quota not found');
      }

      const balanceBefore = current.purchasedQuota;
      const balanceAfter = balanceBefore + amount;

      const quota = await tx.quota.update({
        where: { userId },
        data: {
          purchasedQuota: { increment: amount },
        },
      });

      const transaction = await tx.quotaTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount,
          source: 'PURCHASED',
          balanceBefore,
          balanceAfter,
          reason: orderId ? `Order: ${orderId}` : undefined,
          orderId: orderId ?? undefined,
        },
      });

      return { quota, transaction };
    });
  }

  async createTransaction(params: {
    userId: string;
    type: 'DEDUCT' | 'REFUND' | 'PURCHASE' | 'RESET' | 'ADMIN_GRANT';
    source: QuotaSource;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reason?: string;
    referenceId?: string | null;
    orderId?: string | null;
    actorUserId?: string | null;
  }): Promise<QuotaTransaction> {
    const {
      userId,
      type,
      source,
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      referenceId,
      orderId,
    } = params;
    return this.prisma.quotaTransaction.create({
      data: {
        userId,
        actorUserId: params.actorUserId ?? undefined,
        type,
        source,
        amount,
        balanceBefore,
        balanceAfter,
        reason,
        referenceId: referenceId ?? undefined,
        orderId: orderId ?? undefined,
      },
    });
  }

  async findTransactionById(id: string): Promise<QuotaTransaction | null> {
    return this.prisma.quotaTransaction.findUnique({ where: { id } });
  }

  async findRefundByReferenceId(
    userId: string,
    referenceId: string,
  ): Promise<QuotaTransaction | null> {
    return this.prisma.quotaTransaction.findFirst({
      where: {
        userId,
        type: 'REFUND',
        referenceId,
      },
    });
  }
}
