/**
 * Admin Service
 * 管理员功能业务逻辑
 */

import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import { EmailService } from '../email';
import { ActivityLogService } from '../activity-log';
import type { UserTier, CurrentUserDto } from '../types';

/** Session 有效期（毫秒） - 7 天 */
const SESSION_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

/** Admin 登录响应 */
export interface AdminLoginResult {
  success: boolean;
  sessionToken: string;
  user: CurrentUserDto;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * 管理员登录
   * 验证 ADMIN_PASSWORD 环境变量，创建 Better Auth Session
   */
  async adminLogin(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminLoginResult> {
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminPassword || password !== adminPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 查找或创建管理员用户
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 自动创建管理员账户
      user = await this.prisma.user.create({
        data: {
          email,
          emailVerified: true,
          tier: 'license',
          isAdmin: true,
        },
      });
      this.logger.log(`Created admin user: ${email}`);
    } else if (!user.isAdmin) {
      // 确保是管理员
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });
    }

    // 创建 Better Auth 兼容的 Session
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_EXPIRES_MS);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      success: true,
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier as CurrentUserDto['tier'],
        isAdmin: user.isAdmin,
      },
    };
  }

  /**
   * 管理员登出
   * 删除指定的 Session
   */
  async adminLogout(sessionToken: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { token: sessionToken },
    });
  }

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
      this.prisma.user.groupBy({
        by: ['tier'],
        where: { deletedAt: null }, // 只统计活跃用户的等级分布
        _count: true,
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
      usersByTier[tc.tier] = tc._count;
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
    tier?: UserTier;
    deleted?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const { tier, deleted, limit = 50, offset = 0 } = options || {};

    // 构建查询条件
    const where: {
      tier?: UserTier;
      deletedAt?: null | { not: null };
    } = {};

    if (tier) {
      where.tier = tier;
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
          tier: true,
          isAdmin: true,
          createdAt: true,
          deletedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
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
        include: {
          subscriptionCredits: true,
          purchasedCredits: {
            where: { expiresAt: { gt: new Date() } },
          },
          subscriptions: {
            where: { status: 'active' },
          },
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

    return { user, credits, deletionRecord };
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
  async setUserTier(userId: string, tier: UserTier, operatorId: string) {
    // 先检查用户是否存在
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { tier },
    });

    await this.activityLogService.logAdminAction({
      operatorId,
      action: 'set_tier',
      targetUserId: userId,
      details: { tier },
    });

    return user;
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
