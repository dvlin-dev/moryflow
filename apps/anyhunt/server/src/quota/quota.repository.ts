/**
 * [INPUT]: userId, 配额操作参数
 * [OUTPUT]: Quota 实体, QuotaTransaction 记录
 * [POS]: 配额数据访问层，封装 Prisma 操作，不含业务逻辑
 *        扣减/返还使用条件更新，避免超扣与负数
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  Quota,
  QuotaTransaction,
  QuotaSource,
  SubscriptionStatus,
} from '../../generated/prisma-main/client';
import { calculatePeriodEnd, DEFAULT_MONTHLY_QUOTA } from './quota.constants';
import type { SubscriptionTier } from '../types/tier.types';
import { getEffectiveSubscriptionTier } from '../common/utils/subscription-tier';

export interface QuotaContext {
  quota: Quota | null;
  tier: SubscriptionTier;
}

type QuotaContextRow = Quota & {
  subscriptionTier: SubscriptionTier | null;
  subscriptionStatus: SubscriptionStatus | null;
};

type DeductQuotaLedgerRow = Quota & {
  transactionId: string;
  transactionActorUserId: string | null;
  transactionType: QuotaTransaction['type'];
  transactionAmount: number;
  transactionSource: QuotaTransaction['source'];
  transactionBalanceBefore: number;
  transactionBalanceAfter: number;
  transactionReason: string | null;
  transactionReferenceId: string | null;
  transactionOrderId: string | null;
  transactionCreatedAt: Date;
};

type DeductPaidQuotaLedgerRow = Quota & {
  originalMonthlyLimit: number;
  originalMonthlyUsed: number;
  originalPurchasedQuota: number;
  wasExpired: boolean;
  transactionId: string | null;
  transactionActorUserId: string | null;
  transactionType: QuotaTransaction['type'] | null;
  transactionAmount: number | null;
  transactionSource: QuotaTransaction['source'] | null;
  transactionBalanceBefore: number | null;
  transactionBalanceAfter: number | null;
  transactionReason: string | null;
  transactionReferenceId: string | null;
  transactionOrderId: string | null;
  transactionCreatedAt: Date | null;
};

@Injectable()
export class QuotaRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapDeductLedgerRow(row: DeductQuotaLedgerRow): {
    quota: Quota;
    transaction: QuotaTransaction;
  } {
    const {
      transactionId,
      transactionActorUserId,
      transactionType,
      transactionAmount,
      transactionSource,
      transactionBalanceBefore,
      transactionBalanceAfter,
      transactionReason,
      transactionReferenceId,
      transactionOrderId,
      transactionCreatedAt,
      ...quota
    } = row;

    return {
      quota: quota as Quota,
      transaction: {
        id: transactionId,
        userId: quota.userId,
        actorUserId: transactionActorUserId,
        type: transactionType,
        amount: transactionAmount,
        source: transactionSource,
        balanceBefore: transactionBalanceBefore,
        balanceAfter: transactionBalanceAfter,
        reason: transactionReason,
        referenceId: transactionReferenceId,
        orderId: transactionOrderId,
        createdAt: transactionCreatedAt,
      },
    };
  }

  private mapLedgerTransactions(
    rows: Array<
      Pick<
        DeductPaidQuotaLedgerRow,
        | 'transactionId'
        | 'transactionActorUserId'
        | 'transactionType'
        | 'transactionAmount'
        | 'transactionSource'
        | 'transactionBalanceBefore'
        | 'transactionBalanceAfter'
        | 'transactionReason'
        | 'transactionReferenceId'
        | 'transactionOrderId'
        | 'transactionCreatedAt'
        | 'userId'
      >
    >,
  ): QuotaTransaction[] {
    return rows
      .filter(
        (
          row,
        ): row is typeof row & {
          transactionId: string;
          transactionType: QuotaTransaction['type'];
          transactionAmount: number;
          transactionSource: QuotaTransaction['source'];
          transactionBalanceBefore: number;
          transactionBalanceAfter: number;
          transactionCreatedAt: Date;
        } => row.transactionId !== null,
      )
      .map((row) => ({
        id: row.transactionId,
        userId: row.userId,
        actorUserId: row.transactionActorUserId,
        type: row.transactionType,
        amount: row.transactionAmount,
        source: row.transactionSource,
        balanceBefore: row.transactionBalanceBefore,
        balanceAfter: row.transactionBalanceAfter,
        reason: row.transactionReason,
        referenceId: row.transactionReferenceId,
        orderId: row.transactionOrderId,
        createdAt: row.transactionCreatedAt,
      }));
  }

  // ============ 查询操作 ============

  async getQuotaContext(userId: string): Promise<QuotaContext> {
    const rows = await this.prisma.$queryRaw<QuotaContextRow[]>`
      SELECT
        q.*,
        s."tier" AS "subscriptionTier",
        s."status" AS "subscriptionStatus"
      FROM "Quota" q
      LEFT JOIN "Subscription" s ON s."userId" = q."userId"
      WHERE q."userId" = ${userId}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return { quota: null, tier: 'FREE' };
    }

    const { subscriptionTier, subscriptionStatus, ...quota } = row;
    const tier = getEffectiveSubscriptionTier(
      {
        tier: subscriptionTier,
        status: subscriptionStatus,
      },
      'FREE',
    ) as SubscriptionTier;

    return {
      quota: quota as Quota,
      tier,
    };
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
    const transactionId = randomUUID();
    const rows = await this.prisma.$queryRaw<DeductQuotaLedgerRow[]>`
      WITH updated_quota AS (
        UPDATE "Quota"
        SET "monthlyUsed" = "monthlyUsed" + ${amount}
        WHERE "userId" = ${userId}
          AND "monthlyUsed" + ${amount} <= "monthlyLimit"
        RETURNING *
      ),
      inserted_transaction AS (
        INSERT INTO "QuotaTransaction" (
          "id",
          "userId",
          "type",
          "amount",
          "source",
          "balanceBefore",
          "balanceAfter",
          "reason"
        )
        SELECT
          ${transactionId},
          "userId",
          'DEDUCT'::"QuotaTransactionType",
          ${amount},
          'MONTHLY'::"QuotaSource",
          ("monthlyLimit" - "monthlyUsed") + ${amount},
          ("monthlyLimit" - "monthlyUsed"),
          ${reason ?? null}
        FROM updated_quota
        RETURNING *
      )
      SELECT
        uq.*,
        it."id" AS "transactionId",
        it."actorUserId" AS "transactionActorUserId",
        it."type" AS "transactionType",
        it."amount" AS "transactionAmount",
        it."source" AS "transactionSource",
        it."balanceBefore" AS "transactionBalanceBefore",
        it."balanceAfter" AS "transactionBalanceAfter",
        it."reason" AS "transactionReason",
        it."referenceId" AS "transactionReferenceId",
        it."orderId" AS "transactionOrderId",
        it."createdAt" AS "transactionCreatedAt"
      FROM updated_quota uq
      CROSS JOIN inserted_transaction it
    `;

    const row = rows[0];
    return row ? this.mapDeductLedgerRow(row) : null;
  }

  /**
   * 在事务中执行配额扣减（购买配额）
   */
  async deductPurchasedInTransaction(
    userId: string,
    amount: number,
    reason?: string,
  ): Promise<{ quota: Quota; transaction: QuotaTransaction } | null> {
    const transactionId = randomUUID();
    const rows = await this.prisma.$queryRaw<DeductQuotaLedgerRow[]>`
      WITH updated_quota AS (
        UPDATE "Quota"
        SET "purchasedQuota" = "purchasedQuota" - ${amount}
        WHERE "userId" = ${userId}
          AND "purchasedQuota" >= ${amount}
        RETURNING *
      ),
      inserted_transaction AS (
        INSERT INTO "QuotaTransaction" (
          "id",
          "userId",
          "type",
          "amount",
          "source",
          "balanceBefore",
          "balanceAfter",
          "reason"
        )
        SELECT
          ${transactionId},
          "userId",
          'DEDUCT'::"QuotaTransactionType",
          ${amount},
          'PURCHASED'::"QuotaSource",
          "purchasedQuota" + ${amount},
          "purchasedQuota",
          ${reason ?? null}
        FROM updated_quota
        RETURNING *
      )
      SELECT
        uq.*,
        it."id" AS "transactionId",
        it."actorUserId" AS "transactionActorUserId",
        it."type" AS "transactionType",
        it."amount" AS "transactionAmount",
        it."source" AS "transactionSource",
        it."balanceBefore" AS "transactionBalanceBefore",
        it."balanceAfter" AS "transactionBalanceAfter",
        it."reason" AS "transactionReason",
        it."referenceId" AS "transactionReferenceId",
        it."orderId" AS "transactionOrderId",
        it."createdAt" AS "transactionCreatedAt"
      FROM updated_quota uq
      CROSS JOIN inserted_transaction it
    `;

    const row = rows[0];
    return row ? this.mapDeductLedgerRow(row) : null;
  }

  async deductPaidQuotaInTransaction(
    userId: string,
    amount: number,
    reason: string | undefined,
    now: Date,
  ): Promise<{ quota: Quota; transactions: QuotaTransaction[] } | null> {
    const resetTransactionId = randomUUID();
    const monthlyTransactionId = randomUUID();
    const purchasedTransactionId = randomUUID();
    const nextPeriodEnd = calculatePeriodEnd(now);

    const rows = await this.prisma.$queryRaw<DeductPaidQuotaLedgerRow[]>`
      WITH current_quota AS (
        SELECT
          q.*,
          q."monthlyLimit" AS "originalMonthlyLimit",
          q."monthlyUsed" AS "originalMonthlyUsed",
          q."purchasedQuota" AS "originalPurchasedQuota",
          (q."periodEndAt" <= ${now}) AS "wasExpired",
          CASE
            WHEN q."periodEndAt" <= ${now} THEN 0
            ELSE q."monthlyUsed"
          END AS "normalizedMonthlyUsed",
          CASE
            WHEN q."periodEndAt" <= ${now} THEN ${now}
            ELSE q."periodStartAt"
          END AS "normalizedPeriodStartAt",
          CASE
            WHEN q."periodEndAt" <= ${now} THEN ${nextPeriodEnd}
            ELSE q."periodEndAt"
          END AS "normalizedPeriodEndAt"
        FROM "Quota" q
        WHERE q."userId" = ${userId}
        FOR UPDATE
      ),
      planned_deduct AS (
        SELECT
          cq.*,
          GREATEST(cq."monthlyLimit" - cq."normalizedMonthlyUsed", 0) AS "monthlyRemaining",
          LEAST(
            ${amount},
            GREATEST(cq."monthlyLimit" - cq."normalizedMonthlyUsed", 0)
          ) AS "monthlyToConsume"
        FROM current_quota cq
      ),
      eligible_deduct AS (
        SELECT
          pd.*,
          (${amount} - pd."monthlyToConsume") AS "remainingAfterMonthly",
          LEAST(
            (${amount} - pd."monthlyToConsume"),
            pd."originalPurchasedQuota"
          ) AS "purchasedToConsume"
        FROM planned_deduct pd
        WHERE
          pd."monthlyToConsume" + LEAST(
            (${amount} - pd."monthlyToConsume"),
            pd."originalPurchasedQuota"
          ) = ${amount}
      ),
      updated_quota AS (
        UPDATE "Quota" q
        SET
          "monthlyUsed" = ed."normalizedMonthlyUsed" + ed."monthlyToConsume",
          "purchasedQuota" = ed."originalPurchasedQuota" - ed."purchasedToConsume",
          "periodStartAt" = ed."normalizedPeriodStartAt",
          "periodEndAt" = ed."normalizedPeriodEndAt"
        FROM eligible_deduct ed
        WHERE q."userId" = ed."userId"
        RETURNING
          q.*,
          ed."originalMonthlyLimit",
          ed."originalMonthlyUsed",
          ed."originalPurchasedQuota",
          ed."wasExpired",
          ed."monthlyRemaining",
          ed."monthlyToConsume",
          ed."purchasedToConsume"
      ),
      inserted_transactions AS (
        INSERT INTO "QuotaTransaction" (
          "id",
          "userId",
          "type",
          "amount",
          "source",
          "balanceBefore",
          "balanceAfter",
          "reason"
        )
        SELECT
          ${resetTransactionId},
          uq."userId",
          'RESET'::"QuotaTransactionType",
          uq."originalMonthlyUsed",
          'MONTHLY'::"QuotaSource",
          uq."originalMonthlyLimit" - uq."originalMonthlyUsed",
          uq."originalMonthlyLimit",
          CONCAT('Period reset. Previous used: ', uq."originalMonthlyUsed")
        FROM updated_quota uq
        WHERE uq."wasExpired" = true AND uq."originalMonthlyUsed" > 0

        UNION ALL

        SELECT
          ${monthlyTransactionId},
          uq."userId",
          'DEDUCT'::"QuotaTransactionType",
          uq."monthlyToConsume",
          'MONTHLY'::"QuotaSource",
          uq."monthlyRemaining",
          uq."monthlyRemaining" - uq."monthlyToConsume",
          ${reason ?? null}
        FROM updated_quota uq
        WHERE uq."monthlyToConsume" > 0

        UNION ALL

        SELECT
          ${purchasedTransactionId},
          uq."userId",
          'DEDUCT'::"QuotaTransactionType",
          uq."purchasedToConsume",
          'PURCHASED'::"QuotaSource",
          uq."originalPurchasedQuota",
          uq."originalPurchasedQuota" - uq."purchasedToConsume",
          ${reason ?? null}
        FROM updated_quota uq
        WHERE uq."purchasedToConsume" > 0
        RETURNING *
      )
      SELECT
        uq.*,
        it."id" AS "transactionId",
        it."actorUserId" AS "transactionActorUserId",
        it."type" AS "transactionType",
        it."amount" AS "transactionAmount",
        it."source" AS "transactionSource",
        it."balanceBefore" AS "transactionBalanceBefore",
        it."balanceAfter" AS "transactionBalanceAfter",
        it."reason" AS "transactionReason",
        it."referenceId" AS "transactionReferenceId",
        it."orderId" AS "transactionOrderId",
        it."createdAt" AS "transactionCreatedAt"
      FROM updated_quota uq
      LEFT JOIN inserted_transactions it ON TRUE
      ORDER BY
        CASE it."type"
          WHEN 'RESET'::"QuotaTransactionType" THEN 0
          ELSE 1
        END,
        CASE it."source"
          WHEN 'MONTHLY'::"QuotaSource" THEN 0
          WHEN 'PURCHASED'::"QuotaSource" THEN 1
          ELSE 2
        END
    `;

    const row = rows[0];
    if (!row) {
      return null;
    }

    const {
      transactionId: _transactionId,
      transactionActorUserId: _transactionActorUserId,
      transactionType: _transactionType,
      transactionAmount: _transactionAmount,
      transactionSource: _transactionSource,
      transactionBalanceBefore: _transactionBalanceBefore,
      transactionBalanceAfter: _transactionBalanceAfter,
      transactionReason: _transactionReason,
      transactionReferenceId: _transactionReferenceId,
      transactionOrderId: _transactionOrderId,
      transactionCreatedAt: _transactionCreatedAt,
      originalMonthlyLimit: _originalMonthlyLimit,
      originalMonthlyUsed: _originalMonthlyUsed,
      originalPurchasedQuota: _originalPurchasedQuota,
      wasExpired: _wasExpired,
      ...quota
    } = row;

    return {
      quota: quota as Quota,
      transactions: this.mapLedgerTransactions(rows),
    };
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
