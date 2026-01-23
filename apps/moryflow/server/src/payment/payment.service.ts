/**
 * [INPUT]: (Creem Webhook Events) - 订阅、一次性购买、退款、争议等支付事件
 * [OUTPUT]: (用户等级升降级、积分发放、许可证创建) - 支付后权益交付
 * [POS]: 支付核心服务，处理 Creem Webhook 回调，协调 CreditService/LicenseService 完成发货
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import { LicenseService } from '../license';
import { ActivityLogService, ACTIVITY_CATEGORY } from '../activity-log';
import type { Prisma } from '../../generated/prisma/client';
import type {
  SubscriptionActiveParams,
  SubscriptionCanceledParams,
  SubscriptionPausedParams,
  CheckoutCompletedParams,
} from './dto/payment.dto';
import {
  TIER_CREDITS,
  getCreditPacks,
  getLicenseConfig,
  getTierFromProductId,
} from '../config';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
    private readonly licenseService: LicenseService,
    private readonly configService: ConfigService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ==================== 订阅事件处理 ====================

  /**
   * 处理 subscription.active 事件
   * 带幂等性保护：检查周期结束时间是否已处理过
   */
  async handleSubscriptionActive(
    params: SubscriptionActiveParams,
  ): Promise<void> {
    const { subscriptionId, customerId, productId, userId, periodEnd } = params;

    this.logger.log(
      `Subscription active: ${subscriptionId} for user ${userId}`,
    );

    // 使用事务 + 幂等性检查，避免重复发放积分
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. 检查是否已处理过这个订阅周期
      const existing = await tx.subscription.findUnique({
        where: { creemSubscriptionId: subscriptionId },
      });

      // 如果周期结束时间相同，说明已处理过这个周期
      if (existing?.currentPeriodEnd?.getTime() === periodEnd.getTime()) {
        this.logger.log(
          `Subscription ${subscriptionId} already processed for period ending ${periodEnd.toISOString()}`,
        );
        return;
      }

      // 2. 根据产品确定用户等级和积分
      const tier = getTierFromProductId(productId);
      const credits = TIER_CREDITS[tier] || 0;

      // 3. 创建或更新订阅记录
      await tx.subscription.upsert({
        where: { creemSubscriptionId: subscriptionId },
        create: {
          userId,
          creemSubscriptionId: subscriptionId,
          creemCustomerId: customerId,
          productId,
          tier,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
        update: {
          tier,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        },
      });

      // 4. 发放订阅积分（仅在新周期时发放）
      if (credits > 0) {
        await this.creditService.grantSubscriptionCredits(
          userId,
          credits,
          new Date(),
          periodEnd,
          tx,
        );
      }

      this.logger.log(
        `User ${userId} upgraded to ${tier} with ${credits} credits`,
      );

      // 记录活动日志
      await this.activityLogService.log({
        userId,
        category: ACTIVITY_CATEGORY.PAYMENT,
        action: 'subscription_create',
        details: { productId, tier, credits, subscriptionId },
      });
    });
  }

  /**
   * 处理 subscription.canceled 事件
   * 用户取消订阅但仍在有效期内
   */
  async handleSubscriptionCanceled(
    params: SubscriptionCanceledParams,
  ): Promise<void> {
    const { subscriptionId, userId } = params;

    this.logger.log(`Subscription canceled: ${subscriptionId}`);

    await this.prisma.subscription.update({
      where: { creemSubscriptionId: subscriptionId },
      data: { status: 'canceled', cancelAtPeriodEnd: true },
    });

    // 记录活动日志
    await this.activityLogService.log({
      userId,
      category: ACTIVITY_CATEGORY.PAYMENT,
      action: 'subscription_cancel',
      details: { subscriptionId },
    });
  }

  /**
   * 处理 subscription.paused 事件
   * 用户暂停订阅，保留订阅状态但暂停计费
   */
  async handleSubscriptionPaused(
    params: SubscriptionPausedParams,
  ): Promise<void> {
    const { subscriptionId } = params;

    this.logger.log(`Subscription paused: ${subscriptionId}`);

    await this.prisma.subscription.update({
      where: { creemSubscriptionId: subscriptionId },
      data: { status: 'paused' },
    });
    // 注意：暂停不降级用户，等到过期后再降级
  }

  /**
   * 处理 subscription.expired 事件
   * 订阅真正到期，需要降级用户
   */
  async handleSubscriptionExpired(
    params: SubscriptionCanceledParams,
  ): Promise<void> {
    const { subscriptionId } = params;

    this.logger.log(`Subscription expired: ${subscriptionId}`);

    await this.prisma.subscription.update({
      where: { creemSubscriptionId: subscriptionId },
      data: { status: 'expired', tier: 'free' },
    });
  }

  /**
   * 处理 subscription.update 事件
   * 订阅升降级变更
   */
  async handleSubscriptionUpdate(params: {
    subscriptionId: string;
    productId: string;
    userId: string;
    periodEnd?: Date;
  }): Promise<void> {
    const { subscriptionId, productId, userId, periodEnd } = params;

    this.logger.log(`Subscription updated: ${subscriptionId}`);

    const tier = getTierFromProductId(productId);

    // 更新订阅产品信息
    await this.prisma.subscription.update({
      where: { creemSubscriptionId: subscriptionId },
      data: {
        productId,
        tier,
        ...(periodEnd && { currentPeriodEnd: periodEnd }),
      },
    });

    this.logger.log(`User ${userId} tier updated to ${tier}`);
  }

  /**
   * 处理 refund.created 事件
   * 记录退款，可能需要撤销权益
   */
  handleRefundCreated(params: {
    refundId: string;
    amount: number;
    currency: string;
    subscriptionId?: string;
    orderId?: string;
    userId: string;
  }): void {
    const { refundId, amount, currency, subscriptionId, userId } = params;
    // orderId 未使用，但保留在参数定义中以便将来扩展
    void params.orderId;

    this.logger.log(`Refund created: ${refundId} for ${amount} ${currency}`);

    // 记录退款事件（可扩展为发送通知等）
    // 如果关联订阅，可能需要取消订阅
    if (subscriptionId) {
      this.logger.log(
        `Refund ${refundId} associated with subscription ${subscriptionId}`,
      );
      // 根据业务需求决定是否自动取消订阅或降级用户
    }

    // TODO: 可以在这里发送通知给用户或管理员
    this.logger.warn(
      `Refund processed for user ${userId}. Manual review may be needed.`,
    );
  }

  /**
   * 处理 dispute.created 事件
   * 争议/拒付，需要记录并可能暂停账户
   */
  handleDisputeCreated(params: {
    disputeId: string;
    amount: number;
    currency: string;
    subscriptionId?: string;
    userId: string;
  }): void {
    const { disputeId, amount, currency, userId } = params;
    // subscriptionId 未使用，但保留在参数定义中以便将来扩展
    void params.subscriptionId;

    this.logger.warn(
      `Dispute created: ${disputeId} for ${amount} ${currency} by user ${userId}`,
    );

    // 争议是严重事件，需要特别处理
    // TODO: 可以在这里：
    // 1. 发送告警通知给管理员
    // 2. 暂停用户账户
    // 3. 记录到专门的争议表
    this.logger.warn(
      `Dispute ${disputeId} requires manual review. User: ${userId}`,
    );
  }

  // ==================== 一次性购买处理 ====================

  /**
   * 处理 checkout.completed 事件 (一次性购买)
   * 带幂等性保护，防止重复处理
   */
  async handleCheckoutCompleted(
    params: CheckoutCompletedParams,
  ): Promise<void> {
    const {
      checkoutId,
      orderId,
      productId,
      userId,
      amount,
      currency,
      productType,
      licenseKey,
    } = params;

    this.logger.log(`Checkout completed: ${checkoutId} for ${productType}`);

    // 订单创建 + 发货置于同一事务，避免部分成功
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingOrder = await tx.paymentOrder.findFirst({
        where: {
          OR: [{ creemCheckoutId: checkoutId }, { creemOrderId: orderId }],
        },
      });

      if (existingOrder) {
        this.logger.log(`Checkout ${checkoutId} already processed, skipping`);
        return;
      }

      try {
        await tx.paymentOrder.create({
          data: {
            userId,
            creemCheckoutId: checkoutId,
            creemOrderId: orderId,
            productId,
            productType,
            amount,
            currency,
            status: 'completed',
            completedAt: new Date(),
          },
        });
      } catch (error) {
        if (this.isUniqueConstraintError(error)) {
          this.logger.log(
            `Checkout ${checkoutId} already processed (unique constraint)`,
          );
          return;
        }
        throw error;
      }

      // 根据产品类型处理
      if (productType === 'credits') {
        const credits = getCreditPacks()[productId] || 0;
        if (credits > 0) {
          await this.creditService.grantPurchasedCredits(
            userId,
            credits,
            orderId,
            undefined,
            tx,
          );
          this.logger.log(`Granted ${credits} credits to user ${userId}`);

          // 记录活动日志
          await this.activityLogService.log({
            userId,
            category: ACTIVITY_CATEGORY.PAYMENT,
            action: 'credits_purchase',
            details: { productId, credits, amount, currency },
          });
        }
      } else if (productType === 'license' && licenseKey) {
        const config = getLicenseConfig()[productId] || {
          tier: 'standard',
          activationLimit: 2,
        };
        await this.licenseService.createLicense({
          userId,
          licenseKey,
          orderId,
          tier: config.tier,
          activationLimit: config.activationLimit,
          tx,
        });
        this.logger.log(`Created license for user ${userId}`);
      }
    });
  }

  // ==================== 工具方法 ====================

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

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      !!error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
