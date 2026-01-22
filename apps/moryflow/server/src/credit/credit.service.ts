/**
 * [INPUT]: (userId, amount, orderId?) - 用户ID、积分数量、订单ID
 * [OUTPUT]: (CreditsBalance, void) - 积分余额或消费/发放/欠费操作
 * [POS]: 积分核心服务，管理三类积分（每日免费/订阅/购买）、欠费记录与扣减顺序
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';
import { DAILY_FREE_CREDITS, PURCHASED_CREDITS_EXPIRY_DAYS } from '../config';
import type { Prisma } from '../../generated/prisma/client';

// ==================== Types ====================

export interface CreditsBalance {
  daily: number;
  subscription: number;
  purchased: number;
  total: number;
  debt: number;
  available: number;
}

export interface CreditsSettlement {
  consumed: number;
  debtIncurred: number;
  debtBalance: number;
}

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getPrismaClient(
    tx?: Prisma.TransactionClient,
  ): Prisma.TransactionClient | PrismaService {
    return tx ?? this.prisma;
  }

  private ensurePositiveAmount(amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('amount must be positive');
    }
  }

  // ==================== 时间工具方法 ====================

  /**
   * 获取今日日期 (YYYY-MM-DD) - UTC 时间
   */
  private getTodayDateUTC(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 获取距离 UTC 午夜的秒数
   */
  private getSecondsUntilUTCMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
  }

  // ==================== 查询方法 ====================

  /**
   * 获取每日免费积分余额
   */
  async getDailyCredits(userId: string): Promise<number> {
    const key = `daily_credits:${userId}:${this.getTodayDateUTC()}`;
    const used = await this.redis.get(key);
    const remaining = used
      ? DAILY_FREE_CREDITS - parseInt(used, 10)
      : DAILY_FREE_CREDITS;
    return Math.max(0, remaining);
  }

  /**
   * 获取订阅积分余额
   */
  async getSubscriptionCredits(userId: string): Promise<number> {
    const record = await this.prisma.subscriptionCredits.findUnique({
      where: { userId },
    });

    if (!record) return 0;

    // 检查是否在有效期内
    const now = new Date();
    if (now < record.periodStart || now > record.periodEnd) {
      return 0;
    }

    return record.creditsRemaining;
  }

  /**
   * 获取购买积分余额（未过期的总和）
   */
  async getPurchasedCredits(userId: string): Promise<number> {
    const records = await this.prisma.purchasedCredits.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        remaining: { gt: 0 },
      },
    });

    return records.reduce((sum, r) => sum + r.remaining, 0);
  }

  /**
   * 获取所有积分余额
   */
  async getCreditsBalance(userId: string): Promise<CreditsBalance> {
    const [daily, subscription, purchased, debt] = await Promise.all([
      this.getDailyCredits(userId),
      this.getSubscriptionCredits(userId),
      this.getPurchasedCredits(userId),
      this.getCreditDebt(userId),
    ]);

    const total = daily + subscription + purchased;

    return {
      daily,
      subscription,
      purchased,
      total,
      debt,
      available: debt > 0 ? 0 : total,
    };
  }

  // ==================== 消费方法 ====================

  /**
   * 消费积分并记录欠费（适用于“请求不中断”的计费策略）
   */
  async consumeCreditsWithDebt(
    userId: string,
    amount: number,
  ): Promise<CreditsSettlement> {
    this.ensurePositiveAmount(amount);

    const balance = await this.getCreditsBalance(userId);
    const actualAmount = Math.min(amount, balance.total);

    if (actualAmount > 0) {
      await this.consumeCreditsInternal(userId, actualAmount);
    }

    const debtIncurred = Math.max(amount - actualAmount, 0);
    let debtBalance = balance.debt;

    if (debtIncurred > 0) {
      debtBalance = await this.increaseDebt(userId, debtIncurred);
    }

    return {
      consumed: actualAmount,
      debtIncurred,
      debtBalance,
    };
  }

  /**
   * 更新每日免费积分使用量 (Redis)
   */
  private async updateDailyCreditsUsage(
    userId: string,
    amount: number,
  ): Promise<void> {
    const key = `daily_credits:${userId}:${this.getTodayDateUTC()}`;
    const ttl = this.getSecondsUntilUTCMidnight();

    const newUsed = await this.redis.incrby(key, amount);
    // 首次写入时设置过期时间，若 TTL 丢失则补齐
    if (newUsed === amount) {
      await this.redis.expire(key, ttl);
    } else {
      const currentTtl = await this.redis.ttl(key);
      if (currentTtl < 0) {
        await this.redis.expire(key, ttl);
      }
    }
  }

  /**
   * 在事务中消费购买积分（按过期时间顺序）
   */
  private async consumePurchasedCreditsInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
  ): Promise<number> {
    const records = await tx.purchasedCredits.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        remaining: { gt: 0 },
      },
      orderBy: { expiresAt: 'asc' },
    });

    let remaining = amount;
    for (const record of records) {
      if (remaining <= 0) break;

      const toConsume = Math.min(record.remaining, remaining);
      await tx.purchasedCredits.update({
        where: { id: record.id },
        data: { remaining: { decrement: toConsume } },
      });
      remaining -= toConsume;
    }

    return remaining;
  }

  /**
   * 记录欠费
   */
  private async increaseDebt(userId: string, amount: number): Promise<number> {
    const record = await this.prisma.creditDebt.upsert({
      where: { userId },
      create: { userId, amount },
      update: { amount: { increment: amount } },
    });

    return record.amount;
  }

  /**
   * 获取欠费余额
   */
  private async getCreditDebt(userId: string): Promise<number> {
    const record = await this.prisma.creditDebt.findUnique({
      where: { userId },
    });
    return record?.amount ?? 0;
  }

  /**
   * 使用付费积分抵扣欠费
   */
  private async applyDebtPayment(
    tx: Prisma.TransactionClient | PrismaService,
    userId: string,
    amount: number,
  ): Promise<{ remaining: number }> {
    if (amount <= 0) {
      return { remaining: 0 };
    }

    const debt = await tx.creditDebt.findUnique({ where: { userId } });
    if (!debt || debt.amount <= 0) {
      return { remaining: amount };
    }

    const paid = Math.min(debt.amount, amount);
    await tx.creditDebt.update({
      where: { userId },
      data: { amount: { decrement: paid } },
    });

    return { remaining: amount - paid };
  }

  /**
   * 扣除积分的内部实现（假定 amount > 0）
   */
  private async consumeCreditsInternal(
    userId: string,
    amount: number,
  ): Promise<void> {
    let remaining = amount;

    // 1. 计算每日免费积分消费量（先计算，后执行）
    const dailyAvailable = Math.max(0, await this.getDailyCredits(userId));
    const dailyToConsume = Math.min(dailyAvailable, remaining);
    remaining -= dailyToConsume;

    // 2 & 3. 数据库操作使用交互式事务
    await this.prisma.$transaction(async (tx) => {
      // 2. 消费订阅积分
      if (remaining > 0) {
        const subRecord = await tx.subscriptionCredits.findUnique({
          where: { userId },
        });

        if (subRecord) {
          const now = new Date();
          const isValid =
            now >= subRecord.periodStart && now <= subRecord.periodEnd;
          const available = isValid ? subRecord.creditsRemaining : 0;

          if (available > 0) {
            const toConsume = Math.min(available, remaining);
            await tx.subscriptionCredits.update({
              where: { userId },
              data: { creditsRemaining: { decrement: toConsume } },
            });
            remaining -= toConsume;
          }
        }
      }

      // 3. 消费购买积分（尽量扣除，不抛出错误）
      if (remaining > 0) {
        await this.consumePurchasedCreditsInTx(tx, userId, remaining);
      }
    });

    // 4. 最后更新 Redis（在数据库事务成功后）
    if (dailyToConsume > 0) {
      await this.updateDailyCreditsUsage(userId, dailyToConsume);
    }
  }

  // ==================== 发放方法 ====================

  /**
   * 发放订阅积分
   */
  async grantSubscriptionCredits(
    userId: string,
    amount: number,
    periodStart: Date,
    periodEnd: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    this.ensurePositiveAmount(amount);
    const client = this.getPrismaClient(tx);

    const { remaining } = await this.applyDebtPayment(client, userId, amount);

    await client.subscriptionCredits.upsert({
      where: { userId },
      create: {
        userId,
        creditsTotal: amount,
        creditsRemaining: remaining,
        periodStart,
        periodEnd,
      },
      update: {
        creditsTotal: amount,
        creditsRemaining: remaining,
        periodStart,
        periodEnd,
      },
    });
  }

  /**
   * 发放购买积分
   */
  async grantPurchasedCredits(
    userId: string,
    amount: number,
    orderId?: string,
    expiresAt?: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    this.ensurePositiveAmount(amount);
    const client = this.getPrismaClient(tx);
    const expiry =
      expiresAt ||
      new Date(
        Date.now() + PURCHASED_CREDITS_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      );

    const { remaining } = await this.applyDebtPayment(client, userId, amount);

    await client.purchasedCredits.create({
      data: {
        userId,
        amount,
        remaining,
        orderId,
        expiresAt: expiry,
      },
    });
  }

  /**
   * 检查积分是否已被发放（幂等性检查）
   */
  async hasCreditsBeenGranted(orderId: string): Promise<boolean> {
    const existing = await this.prisma.purchasedCredits.findFirst({
      where: { orderId },
      select: { id: true },
    });
    return existing !== null;
  }
}
