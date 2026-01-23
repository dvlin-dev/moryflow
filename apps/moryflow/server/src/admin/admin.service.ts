/**
 * [INPUT]: 用户/订阅/积分/管理员操作参数
 * [OUTPUT]: 管理员视角的用户与统计结果
 * [POS]: Admin 模块核心业务逻辑
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import { EmailService } from '../email';
import { ActivityLogService } from '../activity-log';
import type { SubscriptionTier } from '../types';

@Injectable()
export class AdminService {
  private mapAdminUser(user: {
    id: string;
    email: string;
    name: string | null;
    isAdmin: boolean;
    createdAt: Date;
    deletedAt: Date | null;
    subscription: { tier: SubscriptionTier } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionTier: user.subscription?.tier ?? 'free',
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
    };
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly emailService: EmailService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * 获取系统统计信息
   */
  async getSystemStats() {
    const [
      totalUsers,
      activeUsers,
      deletedUsers,
      tierCounts,
      creditStats,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: { not: null } } }),
      this.prisma.subscription.findMany({
        where: { user: { deletedAt: null } },
        select: { tier: true },
      }),
      this.prisma.creditUsageDaily.aggregate({
        _sum: {
          creditsUsedDaily: true,
          requestCount: true,
          tokenUsed: true,
        },
      }),
      this.prisma.subscription.count({
        where: { status: 'active' },
      }),
    ]);

    // 转换 tier counts 为 Record 格式
    const usersByTier: Record<string, number> = {};
    for (const tc of tierCounts) {
      usersByTier[tc.tier] = (usersByTier[tc.tier] ?? 0) + 1;
    }

    return {
      totalUsers,
      activeUsers,
      deletedUsers,
      usersByTier,
      activeSubscriptions,
      totalCreditsUsed: creditStats._sum.creditsUsedDaily ?? 0,
      totalApiCalls: creditStats._sum.requestCount ?? 0,
      totalTokenUsed: creditStats._sum.tokenUsed ?? 0,
    };
  }

  /**
   * 获取所有用户
   * @param deleted - undefined: 所有用户, true: 仅已删除, false: 仅活跃用户
   */
  async listUsers(options?: {
    tier?: SubscriptionTier;
    deleted?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { tier, deleted, limit = 50, offset = 0 } = options || {};

    // 构建查询条件
    const where: {
      subscription?: { tier: SubscriptionTier };
      deletedAt?: null | { not: null };
    } = {};

    if (tier) {
      where.subscription = { tier };
    }

    if (deleted === true) {
      where.deletedAt = { not: null };
    } else if (deleted === false) {
      where.deletedAt = null;
    }

    const [users, count] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          createdAt: true,
          deletedAt: true,
          subscription: {
            select: { tier: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => this.mapAdminUser(user)),
      pagination: { count, limit, offset },
    };
  }

  /**
   * 获取用户详情
   */
  async getUserDetails(userId: string) {
    const [user, credits] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          isAdmin: true,
          createdAt: true,
          deletedAt: true,
          subscription: { select: { tier: true } },
        },
      }),
      this.creditService.getCreditsBalance(userId),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 如果用户已删除，获取删除记录
    let deletionRecord = null;
    if (user.deletedAt) {
      deletionRecord = await this.prisma.accountDeletionRecord.findFirst({
        where: { userId },
        select: {
          reason: true,
          feedback: true,
          deletedAt: true,
        },
      });
    }

    return {
      user: this.mapAdminUser({
        ...user,
        subscription: user.subscription ?? null,
      }),
      credits,
      deletionRecord,
    };
  }

  /**
   * 获取账户删除记录列表
   */
  async listDeletionRecords(options?: {
    reason?: string;
    limit?: number;
    offset?: number;
  }) {
    const { reason, limit = 50, offset = 0 } = options || {};

    const where = reason ? { reason } : undefined;

    const [records, count] = await Promise.all([
      this.prisma.accountDeletionRecord.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { deletedAt: 'desc' },
        select: {
          id: true,
          userId: true,
          email: true,
          reason: true,
          feedback: true,
          deletedAt: true,
        },
      }),
      this.prisma.accountDeletionRecord.count({ where }),
    ]);

    return {
      records,
      pagination: { count, limit, offset },
    };
  }

  /**
   * 获取删除原因统计
   */
  async getDeletionStats() {
    const [totalDeleted, reasonCounts] = await Promise.all([
      this.prisma.accountDeletionRecord.count(),
      this.prisma.accountDeletionRecord.groupBy({
        by: ['reason'],
        _count: true,
        orderBy: { _count: { reason: 'desc' } },
      }),
    ]);

    const byReason: Record<string, number> = {};
    for (const rc of reasonCounts) {
      byReason[rc.reason] = rc._count;
    }

    return {
      totalDeleted,
      byReason,
    };
  }

  /**
   * 设置用户等级
   */
  async setSubscriptionTier(
    userId: string,
    tier: SubscriptionTier,
    operatorId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()),
    );

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        tier,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    await this.activityLogService.logAdminAction({
      operatorId,
      action: 'set_tier',
      targetUserId: userId,
      details: { tier },
    });

    return this.mapAdminUser({
      ...user,
      subscription: { tier },
    });
  }

  /**
   * 手动发放积分
   */
  async grantCredits(
    userId: string,
    type: 'subscription' | 'purchased',
    amount: number,
    operatorId: string,
  ) {
    if (type === 'subscription') {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await this.creditService.grantSubscriptionCredits(
        userId,
        amount,
        new Date(),
        periodEnd,
      );
    } else {
      await this.creditService.grantPurchasedCredits(userId, amount);
    }

    await this.activityLogService.logAdminAction({
      operatorId,
      action: 'grant_credits',
      targetUserId: userId,
      details: { type, amount },
    });
  }

  /**
   * 设置管理员权限
   */
  async setAdminPermission(
    targetUserId: string,
    isAdmin: boolean,
    operatorId: string,
  ) {
    // 先检查用户是否存在
    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin },
    });

    await this.activityLogService.logAdminAction({
      operatorId,
      action: isAdmin ? 'grant_admin' : 'revoke_admin',
      targetUserId,
      details: { isAdmin },
    });

    return user;
  }

  /**
   * 获取管理员操作日志
   * 委托给 ActivityLogService
   */
  async getAdminLogs(options?: { limit?: number; offset?: number }) {
    const { limit = 50, offset = 0 } = options || {};

    return this.activityLogService.query({
      category: 'admin',
      limit,
      offset,
    });
  }

  /**
   * 发送邮件
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    operatorId: string,
  ): Promise<void> {
    await this.emailService.sendEmail(to, subject, html);

    await this.activityLogService.logAdminAction({
      operatorId,
      action: 'send_email',
      details: { to, subject },
    });
  }
}
