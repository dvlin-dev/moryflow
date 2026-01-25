/**
 * [INPUT]: Creem webhook payload + signature
 * [OUTPUT]: 订阅/配额更新与幂等处理结果
 * [POS]: Creem Webhook 入口控制器
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
import { PaymentService } from './payment.service';
import { CreemWebhookSchema, type CreemWebhookPayload } from './dto';
import { getQuotaProduct, getSubscriptionProduct } from './payment.constants';

@Controller({ path: 'webhooks/creem', version: VERSION_NEUTRAL })
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
    const eventCreatedAt = this.parseCreemTimestamp(parsed.data.created_at);
    // metadata.referenceId 用于关联用户
    const userId = object.metadata?.referenceId as string | undefined;

    const isFirstTime = await this.paymentService.recordWebhookEvent({
      eventId: parsed.data.id,
      eventType,
      userId,
      creemObjectId: object.id,
      creemOrderId: object.order?.id,
      eventCreatedAt,
    });

    if (!isFirstTime) {
      this.logger.warn(`Duplicate webhook event: ${parsed.data.id}`);
      return { received: true };
    }

    if (!userId) {
      this.logger.warn('No referenceId in webhook payload');
      return { received: true };
    }

    try {
      switch (eventType) {
        case 'subscription.active':
        case 'subscription.trialing':
        case 'subscription.paid': {
          const productId = object.product?.id;
          const subscriptionProduct = productId
            ? getSubscriptionProduct(productId)
            : null;

          if (!subscriptionProduct) {
            this.logger.warn(
              `Unknown subscription product: ${object.product?.id ?? 'missing'}`,
            );
            return { received: true };
          }

          const periodStart = this.parseCreemDate(
            object.current_period_start_date,
          );
          const periodEnd = this.parseCreemDate(object.current_period_end_date);

          if (!periodStart || !periodEnd) {
            this.logger.warn('Missing subscription period in webhook payload');
            return { received: true };
          }

          const creemCustomerId = object.customer?.id;
          if (!creemCustomerId) {
            this.logger.warn('Missing customer id in webhook payload');
            return { received: true };
          }

          await this.paymentService.handleSubscriptionActivated({
            userId,
            creemCustomerId,
            creemSubscriptionId: object.id,
            tier: subscriptionProduct.tier,
            currentPeriodStart: periodStart,
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
            const productId = object.product?.id;
            const quotaProduct = productId ? getQuotaProduct(productId) : null;

            if (!quotaProduct) {
              this.logger.warn(
                `Unknown quota product: ${object.product?.id ?? 'missing'}`,
              );
              return { received: true };
            }

            const orderCurrency = this.normalizeCurrency(object.order.currency);
            if (!orderCurrency) {
              this.logger.warn('Missing order currency in webhook payload');
              return { received: true };
            }

            if (
              object.order.amount !== quotaProduct.price ||
              orderCurrency !== quotaProduct.currency
            ) {
              this.logger.warn(
                `Order mismatch for product ${productId}: amount=${object.order.amount}, currency=${orderCurrency}`,
              );
              return { received: true };
            }

            await this.paymentService.handleQuotaPurchase({
              userId,
              amount: quotaProduct.amount,
              creemOrderId: object.order.id,
              price: object.order.amount,
              currency: orderCurrency,
            });
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

  private parseCreemDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseCreemTimestamp(value?: number): Date | null {
    if (!value) return null;
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private normalizeCurrency(value?: string): string | null {
    if (!value) return null;
    return value.toUpperCase();
  }
}
