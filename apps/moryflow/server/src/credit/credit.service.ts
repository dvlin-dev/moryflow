/**
 * [INPUT]: (userId) - 用户ID
 * [OUTPUT]: (CreditsBalance) - 当前积分余额读模型
 * [POS]: 积分读服务，只负责从 projection 表读取 daily/subscription/purchased/debt 余额
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
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
  constructor(private readonly prisma: PrismaService) {}

  private getTodayDateUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  async getDailyCredits(userId: string): Promise<number> {
    const usage = await this.prisma.creditUsageDaily.findUnique({
      where: {
        userId_date: {
          userId,
          date: this.getTodayDateUTC(),
        },
      },
    });

    return Math.max(0, DAILY_FREE_CREDITS - (usage?.creditsUsedDaily ?? 0));
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
