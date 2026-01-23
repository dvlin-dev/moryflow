/**
 * [INPUT]: Creem webhook payload、用户订阅/配额/订单数据
 * [OUTPUT]: Subscription/Quota/PaymentOrder 更新 + Webhook 幂等记录
 * [POS]: 支付业务逻辑核心（订阅/配额/回调）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma';
import {
  Prisma,
  SubscriptionTier,
  SubscriptionStatus,
  QuotaTransactionType,
  QuotaSource,
} from '../../generated/prisma-main/client';
import { TIER_MONTHLY_QUOTA, addOneMonth } from './payment.constants';
import type {
  SubscriptionActivatedParams,
  QuotaPurchaseParams,
  WebhookEventRecordParams,
} from './payment.types';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 记录 Webhook 事件（用于幂等与重放防护）
   */
  async recordWebhookEvent(data: WebhookEventRecordParams): Promise<boolean> {
    try {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          eventId: data.eventId,
          eventType: data.eventType,
          userId: data.userId ?? null,
          creemObjectId: data.creemObjectId ?? null,
          creemOrderId: data.creemOrderId ?? null,
          eventCreatedAt: data.eventCreatedAt ?? null,
        },
      });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }

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
      const existingSubscription = await tx.subscription.findUnique({
        where: { userId },
        select: {
          currentPeriodStart: true,
          currentPeriodEnd: true,
        },
      });
      const periodChanged =
        !existingSubscription?.currentPeriodStart ||
        !existingSubscription?.currentPeriodEnd ||
        existingSubscription.currentPeriodStart.getTime() !==
          currentPeriodStart.getTime() ||
        existingSubscription.currentPeriodEnd.getTime() !==
          currentPeriodEnd.getTime();

      // 更新或创建订阅
      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier,
          status: SubscriptionStatus.ACTIVE,
          creemCustomerId,
          creemSubscriptionId,
          currentPeriodStart,
          currentPeriodEnd,
        },
        update: {
          tier,
          status: SubscriptionStatus.ACTIVE,
          creemCustomerId,
          creemSubscriptionId,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      // 更新配额
      const monthlyLimit = TIER_MONTHLY_QUOTA[tier];
      await tx.quota.upsert({
        where: { userId },
        create: {
          userId,
          monthlyLimit,
          monthlyUsed: 0,
          periodStartAt: currentPeriodStart,
          periodEndAt: currentPeriodEnd,
        },
        update: {
          monthlyLimit,
          ...(periodChanged ? { monthlyUsed: 0 } : {}),
          periodStartAt: currentPeriodStart,
          periodEndAt: currentPeriodEnd,
        },
      });
    });

    this.logger.log(`Subscription activated for user ${userId}, tier: ${tier}`);
  }

  /**
   * 处理订阅取消
   */
  async handleSubscriptionCanceled(userId: string) {
    const result = await this.prisma.subscription.updateMany({
      where: { userId },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: true,
      },
    });

    if (result.count === 0) {
      this.logger.warn(`Subscription not found for user ${userId}`);
      return;
    }

    this.logger.log(`Subscription canceled for user ${userId}`);
  }

  /**
   * 处理订阅过期（周期结束且已取消）
   */
  async handleSubscriptionExpired(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      // 更新订阅状态
      const now = new Date();
      const periodEnd = addOneMonth(now);

      await tx.subscription.upsert({
        where: { userId },
        create: {
          userId,
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.EXPIRED,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        update: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.EXPIRED,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      });

      // 重置配额为免费版
      await tx.quota.upsert({
        where: { userId },
        create: {
          userId,
          monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
          monthlyUsed: 0,
          periodStartAt: now,
          periodEndAt: periodEnd,
        },
        update: {
          monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
          monthlyUsed: 0,
          periodStartAt: now,
          periodEndAt: periodEnd,
        },
      });
    });

    this.logger.log(`Subscription expired for user ${userId}`);
  }

  /**
   * 处理配额购买
   */
  async handleQuotaPurchase(data: QuotaPurchaseParams) {
    const { userId, amount, creemOrderId, price, currency } = data;

    await this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.paymentOrder.findUnique({
        where: { creemOrderId },
        select: { userId: true },
      });

      if (existingOrder) {
        if (existingOrder.userId !== userId) {
          this.logger.warn(
            `Order ${creemOrderId} belongs to another user (${existingOrder.userId})`,
          );
        }
        return;
      }

      // 先获取当前配额以计算真实的 balance
      const currentQuota = await tx.quota.findUnique({
        where: { userId },
      });

      const balanceBefore = currentQuota?.purchasedQuota ?? 0;
      const balanceAfter = balanceBefore + amount;

      const now = new Date();
      const periodEnd = addOneMonth(now);

      // 增加购买配额
      await tx.quota.upsert({
        where: { userId },
        create: {
          userId,
          monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
          monthlyUsed: 0,
          periodStartAt: now,
          periodEndAt: periodEnd,
          purchasedQuota: amount,
        },
        update: {
          purchasedQuota: { increment: amount },
        },
      });

      // 记录支付订单
      await tx.paymentOrder.create({
        data: {
          userId,
          creemOrderId,
          type: 'quota_purchase',
          amount: price,
          currency,
          status: 'completed',
          quotaAmount: amount,
        },
      });

      // 记录配额变动
      await tx.quotaTransaction.create({
        data: {
          userId,
          type: QuotaTransactionType.PURCHASE,
          amount,
          source: QuotaSource.PURCHASED,
          balanceBefore,
          balanceAfter,
          reason: `Order: ${creemOrderId}`,
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
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      // 创建配额
      await tx.quota.create({
        data: {
          userId,
          monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
          monthlyUsed: 0,
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
