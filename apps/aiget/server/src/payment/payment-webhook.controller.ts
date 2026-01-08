/**
 * Payment Webhook Controller
 * 处理 Creem 支付回调
 */

import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Req,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth';
import { SkipResponseWrap } from '../common/decorators';
import { PaymentService } from './payment.service';
import { CreemWebhookSchema, type CreemWebhookPayload } from './dto';
import { SubscriptionTier } from '../../generated/prisma-main/client';

// Creem 产品 ID 到套餐的映射（需要根据实际配置调整）
const PRODUCT_TO_TIER: Record<string, SubscriptionTier> = {
  // 示例，实际值需要从 Creem 控制台获取
  prod_basic_monthly: SubscriptionTier.BASIC,
  prod_basic_yearly: SubscriptionTier.BASIC,
  prod_pro_monthly: SubscriptionTier.PRO,
  prod_pro_yearly: SubscriptionTier.PRO,
  prod_team_monthly: SubscriptionTier.TEAM,
  prod_team_yearly: SubscriptionTier.TEAM,
};

// 默认订阅周期（30天）
const DEFAULT_SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

@Controller({ path: 'webhooks/creem', version: VERSION_NEUTRAL })
@SkipResponseWrap()
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Creem Webhook 入口
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: CreemWebhookPayload,
    @Headers('creem-signature') signature: string,
  ) {
    this.logger.log(`Received webhook: ${payload.eventType}`);

    const parsed = CreemWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    // 验证 rawBody 存在
    if (!req.rawBody) {
      this.logger.error('Raw body not available for signature verification');
      throw new BadRequestException(
        'Raw body required for signature verification',
      );
    }

    // 验证签名
    const rawBody = req.rawBody.toString();
    if (!this.paymentService.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { eventType, object } = parsed.data;
    // metadata.referenceId 用于关联用户
    const userId = object.metadata?.referenceId as string | undefined;

    if (!userId) {
      this.logger.warn('No referenceId in webhook payload');
      return { received: true };
    }

    try {
      switch (eventType) {
        case 'subscription.active':
        case 'subscription.trialing':
        case 'subscription.paid': {
          const productId = object.product?.id || '';
          const tier = PRODUCT_TO_TIER[productId] || SubscriptionTier.BASIC;
          const periodEnd = object.current_period_end_date
            ? new Date(object.current_period_end_date)
            : new Date(Date.now() + DEFAULT_SUBSCRIPTION_PERIOD_MS);

          await this.paymentService.handleSubscriptionActivated({
            userId,
            creemCustomerId: object.customer?.id || '',
            creemSubscriptionId: object.id,
            tier,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
          });
          break;
        }

        case 'subscription.canceled':
          await this.paymentService.handleSubscriptionCanceled(userId);
          break;

        case 'subscription.expired':
          await this.paymentService.handleSubscriptionExpired(userId);
          break;

        case 'checkout.completed':
          // 检查是否是配额购买（非订阅的一次性购买）
          if (object.order && !object.subscription) {
            const quotaAmount = this.parseQuotaAmount(object.product?.id || '');
            if (quotaAmount > 0) {
              await this.paymentService.handleQuotaPurchase({
                userId,
                amount: quotaAmount,
                creemOrderId: object.order.id,
                price: object.order.amount,
              });
            }
          }
          break;

        default:
          this.logger.log(`Unhandled webhook type: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error}`);
      throw error;
    }

    return { received: true };
  }

  /**
   * 根据 productId 解析配额数量
   */
  private parseQuotaAmount(productId: string): number {
    // 示例配额包配置（需要根据实际产品配置调整）
    const quotaPacks: Record<string, number> = {
      prod_quota_1000: 1000,
      prod_quota_5000: 5000,
      prod_quota_10000: 10000,
      prod_quota_50000: 50000,
    };
    return quotaPacks[productId] || 0;
  }
}
