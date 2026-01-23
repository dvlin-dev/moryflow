/**
 * [INPUT]: actorUserId, targetUserId, amount, reason
 * [OUTPUT]: granted credits result + transaction/audit ids
 * [POS]: Admin 手动充值 Credits（仅增不减），用于内部员工测试
 *        月度配额按有效订阅（ACTIVE）计算
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  calculatePeriodEnd,
  getMonthlyQuotaByTier,
} from '../quota/quota.constants';
import type { SubscriptionTier } from '../types/tier.types';
import { getEffectiveSubscriptionTier } from '../common/utils/subscription-tier';

export interface GrantCreditsParams {
  actorUserId: string;
  targetUserId: string;
  amount: number;
  reason: string;
}

export interface GrantCreditsResult {
  userId: string;
  amount: number;
  purchasedQuotaBefore: number;
  purchasedQuotaAfter: number;
  quotaTransactionId: string;
  auditLogId: string;
}

@Injectable()
export class AdminUserCreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async grantCredits(params: GrantCreditsParams): Promise<GrantCreditsResult> {
    const { actorUserId, targetUserId, amount, reason } = params;

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('amount must be a positive integer');
    }

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      throw new BadRequestException('reason is required');
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          deletedAt: true,
          subscription: { select: { tier: true, status: true } },
          quota: { select: { id: true, purchasedQuota: true } },
        },
      });

      if (!user || user.deletedAt) {
        throw new NotFoundException('User not found');
      }

      const tier = getEffectiveSubscriptionTier(
        user.subscription,
        'FREE',
      ) as SubscriptionTier;
      const monthlyLimit = getMonthlyQuotaByTier(tier);

      const quota = user.quota
        ? user.quota
        : await tx.quota.create({
            data: {
              userId: user.id,
              monthlyLimit,
              monthlyUsed: 0,
              periodStartAt: now,
              periodEndAt: calculatePeriodEnd(now),
              purchasedQuota: amount,
            },
            select: { id: true, purchasedQuota: true },
          });

      let purchasedQuotaAfter: number;
      if (user.quota) {
        const updated = await tx.quota.update({
          where: { id: quota.id },
          data: { purchasedQuota: { increment: amount } },
          select: { purchasedQuota: true },
        });
        purchasedQuotaAfter = updated.purchasedQuota;
      } else {
        purchasedQuotaAfter = quota.purchasedQuota;
      }
      const purchasedQuotaBefore = purchasedQuotaAfter - amount;

      const transaction = await tx.quotaTransaction.create({
        data: {
          userId: user.id,
          actorUserId,
          type: 'ADMIN_GRANT',
          amount,
          source: 'PURCHASED',
          balanceBefore: purchasedQuotaBefore,
          balanceAfter: purchasedQuotaAfter,
          reason: normalizedReason,
        },
        select: { id: true },
      });

      const auditLog = await tx.adminAuditLog.create({
        data: {
          actorUserId,
          targetUserId: user.id,
          action: 'CREDITS_GRANT',
          reason: normalizedReason,
          metadata: {
            amount,
            purchasedQuotaBefore,
            purchasedQuotaAfter,
            quotaTransactionId: transaction.id,
          },
        },
        select: { id: true },
      });

      return {
        userId: user.id,
        amount,
        purchasedQuotaBefore,
        purchasedQuotaAfter,
        quotaTransactionId: transaction.id,
        auditLogId: auditLog.id,
      };
    });
  }

  async listCreditGrants(params: { userId: string; limit: number }): Promise<
    Array<{
      id: string;
      createdAt: Date;
      actorUserId: string | null;
      amount: number;
      balanceBefore: number;
      balanceAfter: number;
      reason: string | null;
    }>
  > {
    const { userId, limit } = params;
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 100',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const rows = await this.prisma.quotaTransaction.findMany({
      where: {
        userId,
        type: 'ADMIN_GRANT',
        source: 'PURCHASED',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        actorUserId: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        reason: true,
      },
    });

    return rows;
  }
}
