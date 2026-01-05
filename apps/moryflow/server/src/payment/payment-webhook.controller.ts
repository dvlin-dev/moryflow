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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth';
import { PaymentService } from './payment.service';
import {
  CreemWebhookSchema,
  type CreemWebhookPayload,
} from './dto/payment.dto';
import { DEFAULT_SUBSCRIPTION_PERIOD_MS } from '../config';

@ApiTags('Payment')
@Controller('webhooks/creem')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({
    summary: 'Creem Webhook',
    description: '接收 Creem 支付平台的 Webhook 回调 (需要签名验证)',
  })
  @ApiHeader({
    name: 'creem-signature',
    description: 'Creem Webhook 签名',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Webhook 处理成功' })
  @ApiResponse({ status: 400, description: '无效签名或请求格式错误' })
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Body() payload: CreemWebhookPayload,
    @Headers('creem-signature') signature: string,
  ) {
    this.logger.log(`Received webhook: ${payload.eventType}`);

    const parsed = CreemWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message);
    }

    // 验证 rawBody 存在（需要在 main.ts 中启用 rawBody: true）
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
        case 'subscription.paid':
          await this.paymentService.handleSubscriptionActive({
            subscriptionId: object.id,
            customerId: object.customer?.id || '',
            productId: object.product?.id || '',
            userId,
            periodEnd: object.current_period_end_date
              ? new Date(object.current_period_end_date)
              : new Date(Date.now() + DEFAULT_SUBSCRIPTION_PERIOD_MS),
          });
          break;

        case 'subscription.canceled':
          await this.paymentService.handleSubscriptionCanceled({
            subscriptionId: object.id,
            userId,
          });
          break;

        case 'subscription.paused':
          await this.paymentService.handleSubscriptionPaused({
            subscriptionId: object.id,
          });
          break;

        case 'subscription.expired':
          await this.paymentService.handleSubscriptionExpired({
            subscriptionId: object.id,
            userId,
          });
          break;

        case 'checkout.completed':
          if (object.order) {
            const productType = this.inferProductType(object.product?.id || '');
            await this.paymentService.handleCheckoutCompleted({
              checkoutId: object.id,
              orderId: object.order.id,
              productId: object.product?.id || '',
              userId,
              amount: object.order.amount,
              currency: object.order.currency || 'USD',
              productType,
              licenseKey: object.license_key,
            });
          }
          break;

        case 'subscription.update':
          await this.paymentService.handleSubscriptionUpdate({
            subscriptionId: object.id,
            productId: object.product?.id || '',
            userId,
            periodEnd: object.current_period_end_date
              ? new Date(object.current_period_end_date)
              : undefined,
          });
          break;

        case 'refund.created':
          // refund.created 的 object 结构不同，需要从嵌套属性获取
          this.paymentService.handleRefundCreated({
            refundId: object.id,
            amount: object.order?.amount || 0,
            currency: object.order?.currency || 'USD',
            subscriptionId:
              typeof object.subscription === 'string'
                ? object.subscription
                : object.subscription?.id,
            orderId: object.order?.id,
            userId,
          });
          break;

        case 'dispute.created':
          // dispute.created 的 object 结构类似 refund
          this.paymentService.handleDisputeCreated({
            disputeId: object.id,
            amount: object.order?.amount || 0,
            currency: object.order?.currency || 'USD',
            subscriptionId:
              typeof object.subscription === 'string'
                ? object.subscription
                : object.subscription?.id,
            userId,
          });
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
   * 根据 productId 推断产品类型
   */
  private inferProductType(productId: string): 'credits' | 'license' {
    if (productId.includes('license')) return 'license';
    return 'credits';
  }
}
