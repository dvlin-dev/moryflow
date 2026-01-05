/**
 * [INPUT]: UserQuery, SubscriptionQuery, OrderQuery, UpdateUserDto, UpdateSubscriptionDto
 * [OUTPUT]: Dashboard stats, paginated lists (users, subscriptions, orders)
 * [POS]: Admin dashboard service - system statistics, user/subscription/order management
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/src/admin/CLAUDE.md
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type {
  UserQuery,
  UpdateUserDto,
  SubscriptionQuery,
  UpdateSubscriptionDto,
  OrderQuery,
} from './dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // =============================================
  // Dashboard
  // =============================================

  async getDashboardStats() {
    const now = new Date();

    // Start of today (UTC)
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);

    // Start of current month (UTC)
    const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

    const [
      totalUsers,
      activeSubscriptions,
      usageRecordsToday,
      revenueResult,
    ] = await Promise.all([
      // Total users (excluding deleted)
      this.prisma.user.count({
        where: { deletedAt: null },
      }),

      // Active subscriptions
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),

      // Usage records created today
      this.prisma.usageRecord.count({
        where: {
          createdAt: { gte: startOfToday },
        },
      }),

      // Revenue MTD (sum of completed orders this month)
      this.prisma.paymentOrder.aggregate({
        _sum: { amount: true },
        where: {
          status: 'completed',
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    const revenueMTD = revenueResult._sum.amount ?? 0;

    return {
      totalUsers,
      activeSubscriptions,
      usageRecordsToday,
      revenueMTD, // Amount in cents
    };
  }

  async getChartData() {
    const now = new Date();

    // 生成近 7 天的日期列表
    const dates: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setUTCHours(0, 0, 0, 0);
      dates.push(date);
    }

    const sevenDaysAgo = dates[0];

    // 查询用量记录数据
    const usageData = await this.prisma.usageRecord.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // 查询收入数据
    const revenueData = await this.prisma.paymentOrder.groupBy({
      by: ['createdAt'],
      _sum: { amount: true },
      where: {
        status: 'completed',
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // 按日期聚合用量数据
    const usageByDate = new Map<string, number>();
    for (const item of usageData) {
      const dateStr = item.createdAt.toISOString().split('T')[0];
      usageByDate.set(
        dateStr,
        (usageByDate.get(dateStr) ?? 0) + item._count.id,
      );
    }

    // 按日期聚合收入数据
    const revenueByDate = new Map<string, number>();
    for (const item of revenueData) {
      const dateStr = item.createdAt.toISOString().split('T')[0];
      revenueByDate.set(
        dateStr,
        (revenueByDate.get(dateStr) ?? 0) + (item._sum.amount ?? 0),
      );
    }

    // 填充所有日期（确保 7 天都有数据）
    const usage = dates.map((date) => {
      const dateStr = date.toISOString().split('T')[0];
      return {
        date: dateStr,
        value: usageByDate.get(dateStr) ?? 0,
      };
    });

    const revenue = dates.map((date) => {
      const dateStr = date.toISOString().split('T')[0];
      return {
        date: dateStr,
        value: revenueByDate.get(dateStr) ?? 0,
      };
    });

    return { usage, revenue };
  }

  // =============================================
  // Users
  // =============================================

  async getUsers(query: UserQuery) {
    const { limit, offset, search, isAdmin } = query;

    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(isAdmin !== undefined && { isAdmin }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
          quota: true,
          _count: {
            select: { usageRecords: true, apiKeys: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        tier: user.subscription?.tier ?? 'FREE',
        subscriptionStatus: user.subscription?.status ?? null,
        quota: user.quota
          ? {
              monthlyLimit: user.quota.monthlyApiLimit,
              monthlyUsed: user.quota.monthlyApiUsed,
            }
          : null,
        usageRecordCount: user._count.usageRecords,
        apiKeyCount: user._count.apiKeys,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        quota: true,
        _count: {
          select: { usageRecords: true, apiKeys: true, webhooks: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
      image: user.image,
      tier: user.subscription?.tier ?? 'FREE',
      subscriptionStatus: user.subscription?.status ?? null,
      quota: user.quota
        ? {
            monthlyLimit: user.quota.monthlyApiLimit,
            monthlyUsed: user.quota.monthlyApiUsed,
            periodEndAt: user.quota.periodEndAt,
          }
        : null,
      usageRecordCount: user._count.usageRecords,
      apiKeyCount: user._count.apiKeys,
      webhookCount: user._count.webhooks,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      include: {
        subscription: true,
        quota: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      isAdmin: updated.isAdmin,
      tier: updated.subscription?.tier ?? 'FREE',
    };
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.session.deleteMany({
        where: { userId: id },
      });
    });
  }

  // =============================================
  // Subscriptions
  // =============================================

  async getSubscriptions(query: SubscriptionQuery) {
    const { limit, offset, search, tier, status } = query;

    const where = {
      ...(tier && { tier }),
      ...(status && { status }),
      ...(search && {
        user: {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items: subscriptions.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        userEmail: sub.user.email,
        userName: sub.user.name,
        tier: sub.tier,
        status: sub.status,
        periodStartAt: sub.periodStartAt,
        periodEndAt: sub.periodEndAt,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  async getSubscription(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return {
      id: subscription.id,
      userId: subscription.userId,
      userEmail: subscription.user.email,
      userName: subscription.user.name,
      tier: subscription.tier,
      status: subscription.status,
      creemCustomerId: subscription.creemCustomerId,
      creemSubscriptionId: subscription.creemSubscriptionId,
      periodStartAt: subscription.periodStartAt,
      periodEndAt: subscription.periodEndAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: dto,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      userEmail: updated.user.email,
      userName: updated.user.name,
      tier: updated.tier,
      status: updated.status,
    };
  }

  // =============================================
  // Orders (PaymentOrder)
  // =============================================

  async getOrders(query: OrderQuery) {
    const { limit, offset, search, status, type } = query;

    // Build user search filter separately
    const userFilter = search
      ? {
          user: {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {};

    const where = {
      ...(status && { status }),
      ...(type && { type }),
      ...userFilter,
    };

    const [orders, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);

    // Get user info for orders
    const userIds = [...new Set(orders.map((o) => o.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      items: orders.map((order) => {
        const user = userMap.get(order.userId);
        return {
          id: order.id,
          userId: order.userId,
          userEmail: user?.email ?? null,
          userName: user?.name ?? null,
          creemOrderId: order.creemOrderId,
          type: order.type,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      }),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  async getOrder(id: string) {
    const order = await this.prisma.paymentOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { id: true, email: true, name: true },
    });

    return {
      id: order.id,
      userId: order.userId,
      userEmail: user?.email ?? null,
      userName: user?.name ?? null,
      creemOrderId: order.creemOrderId,
      type: order.type,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      metadata: order.metadata,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

}
