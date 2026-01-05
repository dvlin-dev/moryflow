/**
 * Payment Controller
 *
 * [INPUT]: User session for payment/subscription info
 * [OUTPUT]: Subscription and quota status
 * [POS]: Console API for payment management
 */

import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth';
import { PrismaService } from '../prisma';
import type { CurrentUserDto } from '../types';

@ApiTags('Payment')
@ApiCookieAuth()
@Controller({ path: 'payment', version: VERSION_NEUTRAL })
export class PaymentController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current user subscription status
   */
  @Get('subscription')
  @ApiOperation({ summary: 'Get subscription status' })
  @ApiOkResponse({ description: 'Subscription status' })
  async getSubscription(@CurrentUser() user: CurrentUserDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
    });

    return {
      tier: subscription?.tier ?? 'FREE',
      status: subscription?.status ?? 'ACTIVE',
      currentPeriodEnd: subscription?.periodEndAt,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    };
  }

  /**
   * Get quota status
   */
  @Get('quota')
  @ApiOperation({ summary: 'Get quota status' })
  @ApiOkResponse({ description: 'Quota status' })
  async getQuota(@CurrentUser() user: CurrentUserDto) {
    const quota = await this.prisma.quota.findUnique({
      where: { userId: user.id },
    });

    if (!quota) {
      return {
        monthly: { limit: 100, used: 0, remaining: 100 },
        periodEndsAt: null,
      };
    }

    return {
      monthly: {
        limit: quota.monthlyApiLimit,
        used: quota.monthlyApiUsed,
        remaining: quota.monthlyApiLimit - quota.monthlyApiUsed,
      },
      periodEndsAt: quota.periodEndAt,
    };
  }
}
