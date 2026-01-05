/**
 * [INPUT]: userId, UpdateProfileDto, ChangePasswordDto, DeleteAccountDto
 * [OUTPUT]: UserProfile, void
 * [POS]: User management service - profile CRUD, password changes, account deletion
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/src/user/CLAUDE.md
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { PrismaService } from '../prisma';
import type { User, Subscription, Quota } from '../../generated/prisma/client';
import type { SubscriptionTier } from '../subscription/subscription.constants';
import type { DeleteAccountDto, UpdateProfileDto, ChangePasswordDto } from './dto';

/** 用户查询结果类型 */
type UserWithRelations = User & {
  subscription: Subscription | null;
  quota: Quota | null;
};

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 格式化用户资料响应
   */
  private formatUserProfile(user: UserWithRelations) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tier: (user.subscription?.tier ?? 'FREE') as SubscriptionTier,
      isAdmin: user.isAdmin,
      quota: user.quota
        ? {
            monthlyLimit: user.quota.monthlyApiLimit,
            monthlyUsed: user.quota.monthlyApiUsed,
            monthlyRemaining: user.quota.monthlyApiLimit - user.quota.monthlyApiUsed,
            periodEndAt: user.quota.periodEndAt,
          }
        : null,
      createdAt: user.createdAt,
    };
  }

  /**
   * 获取用户信息（含订阅和配额）
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        quota: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUserProfile(user);
  }

  /**
   * 更新用户资料
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      include: {
        subscription: true,
        quota: true,
      },
    });

    return this.formatUserProfile(user);
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    // 获取用户的 credential account
    const account = await this.prisma.account.findFirst({
      where: {
        userId,
        providerId: 'credential',
      },
    });

    if (!account?.password) {
      throw new BadRequestException('Password authentication not enabled');
    }

    // 验证当前密码
    const isValid = await verifyPassword({
      password: dto.currentPassword,
      hash: account.password,
    });

    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash 新密码并更新
    const hashedPassword = await hashPassword(dto.newPassword);

    await this.prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    });
  }

  /**
   * 删除账户（软删除）
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    // 1. 获取用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt) {
      throw new BadRequestException('Account has been deleted');
    }

    // 2. 验证确认文字（必须输入邮箱）
    if (dto.confirmation !== user.email) {
      throw new BadRequestException('Confirmation email does not match');
    }

    // 3. 事务处理
    await this.prisma.$transaction(async (tx) => {
      // 3.1 记录删除原因
      await tx.accountDeletionRecord.create({
        data: {
          userId: user.id,
          email: user.email,
          reason: dto.reason,
          feedback: dto.feedback,
        },
      });

      // 3.2 软删除用户
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      });

      // 3.3 清除所有 Session（使所有设备登出）
      await tx.session.deleteMany({
        where: { userId },
      });
    });

    console.log(`[UserService] User ${userId} deleted account, reason: ${dto.reason}`);
  }
}
