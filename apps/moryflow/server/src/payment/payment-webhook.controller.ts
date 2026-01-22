/**
 * [INPUT]: Creem Webhook 回调（rawBody + signature + payload）
 * [OUTPUT]: 订阅/订单/积分/License 的发放或状态更新
 * [POS]: Webhook 安全入口
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
import { getCreditPacks, getLicenseConfig } from '../config';
import { resolveCheckoutProductType } from './payment.utils';

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
    const productId = object.product?.id;

    if (!userId) {
      this.logger.warn('No referenceId in webhook payload');
      return { received: true };
    }

    try {
      switch (eventType) {
        case 'subscription.active':
        case 'subscription.trialing':
        case 'subscription.paid':
          if (!productId) {
            throw new BadRequestException('Missing productId for subscription');
          }
          await this.paymentService.handleSubscriptionActive({
            subscriptionId: object.id,
            customerId: object.customer?.id || '',
            productId,
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
            if (!productId) {
              throw new BadRequestException('Missing productId for checkout');
            }
            const productType = resolveCheckoutProductType(
              productId,
              getCreditPacks(),
              getLicenseConfig(),
            );
            await this.paymentService.handleCheckoutCompleted({
              checkoutId: object.id,
              orderId: object.order.id,
              productId,
              userId,
              amount: object.order.amount,
              currency: object.order.currency || 'USD',
              productType,
              licenseKey: object.license_key,
            });
          }
          break;

        case 'subscription.update':
          if (!productId) {
            throw new BadRequestException('Missing productId for subscription');
          }
          await this.paymentService.handleSubscriptionUpdate({
            subscriptionId: object.id,
            productId,
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

  // 产品类型推断改为配置映射，避免字符串推断误判
}
