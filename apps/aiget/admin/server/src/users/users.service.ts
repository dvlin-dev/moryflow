/**
 * [INPUT]: 用户管理请求数据
 * [OUTPUT]: 用户数据、操作结果
 * [POS]: 用户管理服务
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@aiget/identity-db';
import type { RequestUser } from '@aiget/auth-server';
import { IDENTITY_PRISMA } from '../prisma/prisma.module';
import type {
  ListUsersQuery,
  SetTierInput,
  GrantCreditsInput,
  UserDetail,
  UserListItem,
  PaginatedResponse,
  SubscriptionTier,
} from './dto';

@Injectable()
export class UsersService {
  constructor(@Inject(IDENTITY_PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * 获取用户列表
   */
  async listUsers(query: ListUsersQuery): Promise<PaginatedResponse<UserListItem>> {
    const { page, limit, search, tier, isAdmin } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tier) {
      where.tier = tier;
    }

    if (isAdmin !== undefined) {
      where.isAdmin = isAdmin;
    }

    // 并行查询
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          tier: true,
          creditBalance: true,
          isAdmin: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取用户详情
   */
  async getUserById(id: string): Promise<UserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        _count: {
          select: {
            sessions: true,
            subscriptions: true,
            orders: true,
            credits: true,
          },
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
      emailVerified: user.emailVerified,
      tier: user.tier as SubscriptionTier,
      creditBalance: user.creditBalance,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      deletedAt: user.deletedAt?.toISOString() ?? null,
      profile: user.profile
        ? {
            nickname: user.profile.nickname,
            avatar: user.profile.avatar,
            locale: user.profile.locale,
            timezone: user.profile.timezone,
          }
        : null,
      _count: user._count,
    };
  }

  /**
   * 设置用户等级
   */
  async setTier(userId: string, input: SetTierInput, admin: RequestUser): Promise<UserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldTier = user.tier;

    // 更新用户等级
    await this.prisma.user.update({
      where: { id: userId },
      data: { tier: input.tier },
    });

    // 记录管理日志
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        targetUserId: userId,
        targetUserEmail: user.email,
        action: 'SET_TIER',
        level: 'INFO',
        details: {
          oldTier,
          newTier: input.tier,
          reason: input.reason,
        },
      },
    });

    return this.getUserById(userId);
  }

  /**
   * 发放积分
   */
  async grantCredits(
    userId: string,
    input: GrantCreditsInput,
    admin: RequestUser
  ): Promise<UserDetail> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, creditBalance: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const oldBalance = user.creditBalance;

      const updated = await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: input.amount } },
        select: { creditBalance: true },
      });

      // 创建积分流水记录（balance 使用事务内的最新值，避免并发丢更新）
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'BONUS',
          amount: input.amount,
          balance: updated.creditBalance,
          reason: input.reason,
          metadata: {
            grantedBy: admin.id,
            grantedByEmail: admin.email,
          },
        },
      });

      // 记录管理日志
      await tx.adminLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          targetUserId: userId,
          targetUserEmail: user.email,
          action: 'GRANT_CREDITS',
          level: 'INFO',
          details: {
            amount: input.amount,
            oldBalance,
            newBalance: updated.creditBalance,
            reason: input.reason,
          },
        },
      });
    });

    return this.getUserById(userId);
  }

  /**
   * 软删除用户
   */
  async deleteUser(userId: string, admin: RequestUser): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 软删除用户
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    // 删除所有 session（强制登出）
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    // 记录管理日志
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        targetUserId: userId,
        targetUserEmail: user.email,
        action: 'DELETE_USER',
        level: 'WARN',
        details: {
          email: user.email,
          tier: user.tier,
        },
      },
    });
  }

  /**
   * 恢复用户
   */
  async restoreUser(userId: string, admin: RequestUser): Promise<UserDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 恢复用户
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });

    // 记录管理日志
    await this.prisma.adminLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        targetUserId: userId,
        targetUserEmail: user.email,
        action: 'RESTORE_USER',
        level: 'INFO',
        details: {},
      },
    });

    return this.getUserById(userId);
  }
}
