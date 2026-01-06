import { Injectable, Inject } from '@nestjs/common';
import type { PrismaClient } from '@aiget/identity-db';
import { IDENTITY_PRISMA } from '../prisma/prisma.module';
import type { StatsResponse } from './dto';

@Injectable()
export class StatsService {
  constructor(@Inject(IDENTITY_PRISMA) private readonly prisma: PrismaClient) {}

  async getStats(): Promise<StatsResponse> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 并行查询所有统计数据
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      tierDistribution,
      paidOrders,
      creditsGranted,
      creditsConsumed,
    ] = await Promise.all([
      // 总用户数（不含软删除）
      this.prisma.user.count({ where: { deletedAt: null } }),
      // 活跃用户（30 天内有 session）
      this.prisma.user.count({
        where: {
          deletedAt: null,
          sessions: { some: { updatedAt: { gte: monthAgo } } },
        },
      }),
      // 今日新增
      this.prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      // 本周新增
      this.prisma.user.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      // 本月新增
      this.prisma.user.count({
        where: { createdAt: { gte: monthAgo } },
      }),
      // 等级分布
      this.prisma.user.groupBy({
        by: ['tier'],
        _count: { tier: true },
        where: { deletedAt: null },
      }),
      // 已支付订单总额
      this.prisma.order.aggregate({
        _sum: { amount: true },
        where: { status: 'PAID' },
      }),
      // 总发放积分
      this.prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: { amount: { gt: 0 } },
      }),
      // 总消费积分
      this.prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: { amount: { lt: 0 } },
      }),
    ]);

    // 转换等级分布
    const tierMap = {
      FREE: 0,
      STARTER: 0,
      PRO: 0,
      MAX: 0,
    };
    for (const tier of tierDistribution) {
      tierMap[tier.tier as keyof typeof tierMap] = tier._count.tier;
    }

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      tierDistribution: tierMap,
      totalRevenue: paidOrders._sum.amount ?? 0,
      totalCreditsGranted: creditsGranted._sum.amount ?? 0,
      totalCreditsConsumed: Math.abs(creditsConsumed._sum.amount ?? 0),
    };
  }
}
