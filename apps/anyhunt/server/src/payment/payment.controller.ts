/**
 * [INPUT]: 当前登录用户
 * [OUTPUT]: 订阅与配额状态
 * [POS]: Payment API 入口（app Session 查询）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import { PrismaService } from '../prisma';
import type { CurrentUserDto } from '../types';

@ApiTags('Payment')
@Controller({ path: 'app/payment', version: '1' })
export class PaymentController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取当前用户的订阅状态
   */
  @Get('subscription')
  async getSubscription(@CurrentUser() user: CurrentUserDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    return {
      tier: subscription?.tier ?? 'FREE',
      status: subscription?.status ?? 'EXPIRED',
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    };
  }

  /**
   * 获取配额状态
   */
  @Get('quota')
  async getQuota(@CurrentUser() user: CurrentUserDto) {
    const quota = await this.prisma.quota.findUnique({
      where: { userId: user.id },
    });

    if (!quota) {
      return {
        monthly: { limit: 100, used: 0, remaining: 100 },
        purchased: 0,
        periodEndsAt: null,
      };
    }

    return {
      monthly: {
        limit: quota.monthlyLimit,
        used: quota.monthlyUsed,
        remaining: quota.monthlyLimit - quota.monthlyUsed,
      },
      purchased: quota.purchasedQuota,
      periodEndsAt: quota.periodEndAt,
    };
  }
}
