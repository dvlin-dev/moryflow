/**
 * [INPUT]: (userId) - 用户ID
 * [OUTPUT]: (CreditsBalance) - 当前积分余额读模型
 * [POS]: 积分读服务，优先读取 projection 表，并在 daily bucket 上兼容 legacy Redis cutover 过渡态
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';
import { DAILY_FREE_CREDITS } from '../config';

export interface CreditsBalance {
  daily: number;
  subscription: number;
  purchased: number;
  total: number;
  debt: number;
  available: number;
}

@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getTodayDateUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private getLegacyDailyCreditsKey(userId: string, date: string): string {
    return `daily_credits:${userId}:${date}`;
  }

  private async getLegacyDailyCreditsUsed(
    userId: string,
    date: string,
  ): Promise<number> {
    const raw = await this.redis.get(
      this.getLegacyDailyCreditsKey(userId, date),
    );
    if (!raw) {
      return 0;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  async getDailyCredits(userId: string): Promise<number> {
    const date = this.getTodayDateUTC();
    const [usage, legacyDailyUsed] = await Promise.all([
      this.prisma.creditUsageDaily.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      }),
      this.getLegacyDailyCreditsUsed(userId, date),
    ]);

    const dailyUsed = Math.max(usage?.creditsUsedDaily ?? 0, legacyDailyUsed);
    return Math.max(0, DAILY_FREE_CREDITS - dailyUsed);
  }

  async getSubscriptionCredits(userId: string): Promise<number> {
    const record = await this.prisma.subscriptionCredits.findUnique({
      where: { userId },
    });

    if (!record) {
      return 0;
    }

    const now = new Date();
    if (now < record.periodStart || now > record.periodEnd) {
      return 0;
    }

    return record.creditsRemaining;
  }

  async getPurchasedCredits(userId: string): Promise<number> {
    const records = await this.prisma.purchasedCredits.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        remaining: { gt: 0 },
      },
    });

    return records.reduce((sum, record) => sum + record.remaining, 0);
  }

  async getCreditDebt(userId: string): Promise<number> {
    const record = await this.prisma.creditDebt.findUnique({
      where: { userId },
    });
    return record?.amount ?? 0;
  }

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
}
