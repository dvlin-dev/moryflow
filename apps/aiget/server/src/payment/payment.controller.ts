/**
 * Payment Controller
 * 支付相关 API
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import { PrismaService } from '../prisma';
import type { CurrentUserDto } from '../types';

@ApiTags('Payment')
@Controller({ path: 'payment', version: '1' })
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
      status: subscription?.status ?? 'ACTIVE',
      currentPeriodEnd: subscription?.currentPeriodEnd,
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
