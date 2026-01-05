/**
 * [INPUT]: userId, UsageType, quantity
 * [OUTPUT]: UsageRecord, UsageSummary
 * [POS]: 用量记录服务，用于 Enterprise 按量计费
 *
 * 职责：只负责记录和查询用量，不做配额检查
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum UsageType {
  MEMORY = 'MEMORY',
  API_CALL = 'API_CALL',
}

export interface UsageSummary {
  memories: number;
  apiCalls: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录用量
   */
  async recordUsage(
    userId: string,
    type: UsageType,
    quantity: number = 1,
  ): Promise<void> {
    await this.prisma.usageRecord.create({
      data: {
        userId,
        type,
        quantity,
        billingPeriod: this.getCurrentBillingPeriod(),
      },
    });

    this.logger.debug(`Recorded usage: user=${userId}, type=${type}, quantity=${quantity}`);
  }

  /**
   * 通过 API Key 记录用量
   */
  async recordUsageByApiKey(
    apiKeyId: string,
    type: UsageType,
    quantity: number = 1,
  ): Promise<void> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: apiKeyId },
      select: { userId: true },
    });

    if (!apiKey) {
      this.logger.warn(`API Key not found: ${apiKeyId}`);
      return;
    }

    await this.recordUsage(apiKey.userId, type, quantity);
  }

  /**
   * 获取指定账期的用量汇总
   */
  async getMonthlyUsage(userId: string, billingPeriod?: string): Promise<UsageSummary> {
    const period = billingPeriod ?? this.getCurrentBillingPeriod();

    const records = await this.prisma.usageRecord.groupBy({
      by: ['type'],
      where: { userId, billingPeriod: period },
      _sum: { quantity: true },
    });

    return {
      memories: records.find((r) => r.type === 'MEMORY')?._sum.quantity ?? 0,
      apiCalls: records.find((r) => r.type === 'API_CALL')?._sum.quantity ?? 0,
    };
  }

  /**
   * 获取用户所有账期的用量记录
   */
  async getUsageHistory(
    userId: string,
    limit: number = 12,
  ): Promise<Array<{ billingPeriod: string } & UsageSummary>> {
    const periods = await this.prisma.usageRecord.groupBy({
      by: ['billingPeriod'],
      where: { userId },
      orderBy: { billingPeriod: 'desc' },
      take: limit,
    });

    const result: Array<{ billingPeriod: string } & UsageSummary> = [];

    for (const period of periods) {
      const usage = await this.getMonthlyUsage(userId, period.billingPeriod);
      result.push({
        billingPeriod: period.billingPeriod,
        ...usage,
      });
    }

    return result;
  }

  /**
   * 获取每日用量统计（用于图表展示）
   * @param userId 用户 ID
   * @param days 获取多少天的数据，默认 30 天
   */
  async getDailyUsage(
    userId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; memories: number; apiCalls: number }>> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 获取所有记录
    const records = await this.prisma.usageRecord.findMany({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
      select: {
        type: true,
        quantity: true,
        createdAt: true,
      },
    });

    // 初始化日期映射（使用 UTC 日期字符串确保一致性）
    const dateMap = new Map<string, { memories: number; apiCalls: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { memories: 0, apiCalls: 0 });
    }

    // 汇总每日用量
    for (const record of records) {
      const dateStr = record.createdAt.toISOString().split('T')[0];
      const existing = dateMap.get(dateStr);
      if (existing) {
        if (record.type === 'MEMORY') {
          existing.memories += record.quantity;
        } else if (record.type === 'API_CALL') {
          existing.apiCalls += record.quantity;
        }
      }
    }

    // 转换为数组（已按日期升序排列）
    return Array.from(dateMap.entries()).map(([date, usage]) => ({
      date,
      ...usage,
    }));
  }

  /**
   * 获取用户统计概览
   */
  async getUserStats(userId: string): Promise<{
    totalMemories: number;
    totalApiCalls: number;
    thisMonthMemories: number;
    thisMonthApiCalls: number;
  }> {
    const currentPeriod = this.getCurrentBillingPeriod();

    // 总用量
    const totalRecords = await this.prisma.usageRecord.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { quantity: true },
    });

    // 本月用量
    const monthlyRecords = await this.prisma.usageRecord.groupBy({
      by: ['type'],
      where: { userId, billingPeriod: currentPeriod },
      _sum: { quantity: true },
    });

    return {
      totalMemories: totalRecords.find((r) => r.type === 'MEMORY')?._sum.quantity ?? 0,
      totalApiCalls: totalRecords.find((r) => r.type === 'API_CALL')?._sum.quantity ?? 0,
      thisMonthMemories: monthlyRecords.find((r) => r.type === 'MEMORY')?._sum.quantity ?? 0,
      thisMonthApiCalls: monthlyRecords.find((r) => r.type === 'API_CALL')?._sum.quantity ?? 0,
    };
  }

  /**
   * 获取当前账期标识 (格式: "2026-01")
   */
  private getCurrentBillingPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
