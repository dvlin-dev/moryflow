/**
 * User Service
 * 用户相关业务逻辑
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { ActivityLogService, ACTIVITY_CATEGORY } from '../activity-log';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async getCurrentUserSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        createdAt: true,
        isAdmin: true,
        deletedAt: true,
        subscription: {
          select: { tier: true },
        },
        profile: {
          select: { displayName: true },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.profile?.displayName || user.name,
      image: user.image ?? undefined,
      createdAt: user.createdAt.toISOString(),
      subscriptionTier: user.subscription?.tier ?? 'free',
      isAdmin: user.isAdmin,
    };
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    return {
      userId,
      displayName: profile?.displayName ?? undefined,
      avatarUrl: profile?.avatarUrl ?? undefined,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const nextProfileData: { displayName?: string | null } = {};
    if (dto.displayName !== undefined) {
      nextProfileData.displayName = dto.displayName.trim() || null;
    }

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: nextProfileData.displayName ?? null,
      },
      update: nextProfileData,
      select: {
        userId: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    return {
      userId: profile.userId,
      displayName: profile.displayName ?? undefined,
      avatarUrl: profile.avatarUrl ?? undefined,
    };
  }

  /**
   * 删除账户（软删除）
   */
  async deleteAccount(
    userId: string,
    dto: DeleteAccountDto,
    ip?: string,
  ): Promise<void> {
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

    // 4. 记录活动日志
    await this.activityLogService.log({
      userId,
      category: ACTIVITY_CATEGORY.AUTH,
      action: 'account_deleted',
      details: { reason: dto.reason },
      ip,
    });
  }
}
