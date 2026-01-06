/**
 * [INPUT]: userId, 配额操作参数
 * [OUTPUT]: Quota 实体, QuotaTransaction 记录
 * [POS]: 配额数据访问层，封装 Prisma 操作，不含业务逻辑
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  Quota,
  QuotaTransaction,
  QuotaSource,
  Prisma,
} from '../../generated/prisma/client';
import { calculatePeriodEnd, DEFAULT_MONTHLY_QUOTA } from './quota.constants';

@Injectable()
export class QuotaRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ============ 查询操作 ============

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

  /**
   * 查询用户是否有返还记录（用于幂等性检查）
   */
  async hasRefundForScreenshot(
    userId: string,
    screenshotId: string,
  ): Promise<boolean> {
    const count = await this.prisma.quotaTransaction.count({
      where: {
        userId,
        type: 'REFUND',
        reason: screenshotId,
      },
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
  async updateMonthlyLimit(userId: string, monthlyLimit: number): Promise<Quota> {
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
  ): Promise<{ quota: Quota; transaction: QuotaTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      // 获取当前配额（锁定行）
      const current = await tx.quota.findUnique({
        where: { userId },
      });

      if (!current) {
        throw new Error('Quota not found');
      }

      const balanceBefore = current.monthlyLimit - current.monthlyUsed;
      const balanceAfter = balanceBefore - amount;

      // 更新配额
      const quota = await tx.quota.update({
        where: { userId },
        data: {
          monthlyUsed: { increment: amount },
        },
      });

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
  ): Promise<{ quota: Quota; transaction: QuotaTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.quota.findUnique({
        where: { userId },
      });

      if (!current) {
        throw new Error('Quota not found');
      }

      const balanceBefore = current.purchasedQuota;
      const balanceAfter = balanceBefore - amount;

      const quota = await tx.quota.update({
        where: { userId },
        data: {
          purchasedQuota: { decrement: amount },
        },
      });

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
  ): Promise<{ quota: Quota; transaction: QuotaTransaction }> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.quota.findUnique({
        where: { userId },
      });

      if (!current) {
        throw new Error('Quota not found');
      }

      let balanceBefore: number;
      let balanceAfter: number;
      let updateData: Prisma.QuotaUpdateInput;

      if (source === 'MONTHLY') {
        balanceBefore = current.monthlyLimit - current.monthlyUsed;
        balanceAfter = balanceBefore + amount;
        updateData = { monthlyUsed: { decrement: amount } };
      } else {
        balanceBefore = current.purchasedQuota;
        balanceAfter = balanceBefore + amount;
        updateData = { purchasedQuota: { increment: amount } };
      }

      const quota = await tx.quota.update({
        where: { userId },
        data: updateData,
      });

      const transaction = await tx.quotaTransaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount,
          source,
          balanceBefore,
          balanceAfter,
          reason,
        },
      });

      return { quota, transaction };
    });
  }

  /**
   * 在事务中执行周期重置
   */
  async resetPeriodInTransaction(
    userId: string,
  ): Promise<{ quota: Quota; transaction: QuotaTransaction; previousUsed: number }> {
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

      // 只有当之前有使用量时才创建重置记录
      const transaction = await tx.quotaTransaction.create({
        data: {
          userId,
          type: 'RESET',
          amount: previousUsed,
          source: 'MONTHLY',
          balanceBefore: current.monthlyLimit - previousUsed,
          balanceAfter: current.monthlyLimit,
          reason: `Period reset. Previous used: ${previousUsed}`,
        },
      });

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
        },
      });

      return { quota, transaction };
    });
  }
}
