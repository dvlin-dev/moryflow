/**
 * Payment Service
 *
 * [INPUT]: Payment/subscription webhook events
 * [OUTPUT]: User subscription and quota updates
 * [POS]: Core payment handling with Creem integration
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma';
import {
  SubscriptionTier,
  SubscriptionStatus,
} from '../../generated/prisma/client';
import { TIER_MONTHLY_QUOTA, addOneMonth } from './payment.constants';
import type { SubscriptionActivatedParams, QuotaPurchaseParams } from './dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 处理订阅激活（Creem webhook 回调）
   */
  async handleSubscriptionActivated(data: SubscriptionActivatedParams) {
    const {
      userId,
      creemCustomerId,
      creemSubscriptionId,
      tier,
      currentPeriodStart,
      currentPeriodEnd,
    } = data;

    await this.prisma.$transaction(async (tx) => {
      // 更新或创建订阅
      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier,
          status: SubscriptionStatus.ACTIVE,
          creemCustomerId,
          creemSubscriptionId,
          periodStartAt: currentPeriodStart,
          periodEndAt: currentPeriodEnd,
        },
        update: {
          tier,
          status: SubscriptionStatus.ACTIVE,
          creemCustomerId,
          creemSubscriptionId,
          periodStartAt: currentPeriodStart,
          periodEndAt: currentPeriodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      // 更新配额
      const monthlyApiLimit = TIER_MONTHLY_QUOTA[tier];
      await tx.quota.upsert({
        where: { userId },
        create: {
          userId,
          monthlyApiLimit,
          monthlyApiUsed: 0,
          periodStartAt: currentPeriodStart,
          periodEndAt: currentPeriodEnd,
        },
        update: {
          monthlyApiLimit,
          monthlyApiUsed: 0, // 重置使用量
          periodStartAt: currentPeriodStart,
          periodEndAt: currentPeriodEnd,
        },
      });
    });

    this.logger.log(
      `Subscription activated for user ${userId}, tier: ${tier}`,
    );
  }

  /**
   * 处理订阅取消
   */
  async handleSubscriptionCanceled(userId: string) {
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
      },
    });

    this.logger.log(`Subscription canceled for user ${userId}`);
  }

  /**
   * 处理订阅过期（周期结束且已取消）
   */
  async handleSubscriptionExpired(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      // 更新订阅状态
      await tx.subscription.update({
        where: { userId },
        data: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.EXPIRED,
        },
      });

      // 重置配额为免费版
      const now = new Date();
      const periodEnd = addOneMonth(now);

      await tx.quota.update({
        where: { userId },
        data: {
          monthlyApiLimit: TIER_MONTHLY_QUOTA.FREE,
          monthlyApiUsed: 0,
          periodStartAt: now,
          periodEndAt: periodEnd,
        },
      });
    });

    this.logger.log(`Subscription expired for user ${userId}`);
  }

  /**
   * 处理配额购买
   * 注意：当前 schema 不支持配额购买，此方法仅记录订单
   */
  async handleQuotaPurchase(data: QuotaPurchaseParams) {
    const { userId, amount, creemOrderId, price } = data;

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const periodEnd = addOneMonth(now);

      // 确保用户有配额记录
      await tx.quota.upsert({
        where: { userId },
        create: {
          userId,
          monthlyApiLimit: TIER_MONTHLY_QUOTA.FREE,
          monthlyApiUsed: 0,
          periodStartAt: now,
          periodEndAt: periodEnd,
        },
        update: {
          // 增加月度配额限制
          monthlyApiLimit: { increment: amount },
        },
      });

      // 记录支付订单
      await tx.paymentOrder.create({
        data: {
          userId,
          creemOrderId,
          type: 'quota_purchase',
          amount: price,
          status: 'completed',
          metadata: { quotaAmount: amount },
        },
      });
    });

    this.logger.log(`Quota purchased for user ${userId}, amount: ${amount}`);
  }

  /**
   * 初始化新用户配额（注册时调用）
   */
  async initializeUserQuota(userId: string) {
    const now = new Date();
    const periodEnd = addOneMonth(now);

    await this.prisma.$transaction(async (tx) => {
      // 检查是否已存在（幂等处理）
      const existing = await tx.subscription.findUnique({
        where: { userId },
      });

      if (existing) {
        this.logger.warn(
          `User ${userId} already has subscription, skipping initialization`,
        );
        return;
      }

      // 创建免费订阅
      await tx.subscription.create({
        data: {
          userId,
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          periodStartAt: now,
          periodEndAt: periodEnd,
        },
      });

      // 创建配额
      await tx.quota.create({
        data: {
          userId,
          monthlyApiLimit: TIER_MONTHLY_QUOTA.FREE,
          monthlyApiUsed: 0,
          periodStartAt: now,
          periodEndAt: periodEnd,
        },
      });
    });

    this.logger.log(`Initialized quota for user ${userId}`);
  }

  /**
   * 验证 Creem Webhook 签名
   * Creem 使用 HMAC-SHA256 签名
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = this.configService.get<string>('CREEM_WEBHOOK_SECRET');
    if (!secret || !signature) {
      this.logger.warn('Missing webhook secret or signature');
      return false;
    }

    try {
      const expectedSignature = createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      // 使用时间安全比较防止时序攻击
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      this.logger.error('Signature verification error', error);
      return false;
    }
  }
}
