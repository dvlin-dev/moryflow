/**
 * Payment Webhook Controller
 *
 * [INPUT]: Creem webhook events with HMAC signature
 * [OUTPUT]: Acknowledgment response
 * [POS]: Public webhook endpoint for payment provider callbacks
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
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth';
import { SkipResponseWrap } from '../common/decorators';
import { PaymentService } from './payment.service';
import { CreemWebhookSchema, type CreemWebhookPayload } from './dto';
import { SubscriptionTier } from '../../generated/prisma/client';

// Creem product ID to tier mapping (adjust based on actual config)
const PRODUCT_TO_TIER: Record<string, SubscriptionTier> = {
  'prod_hobby_monthly': SubscriptionTier.HOBBY,
  'prod_hobby_yearly': SubscriptionTier.HOBBY,
  'prod_enterprise_monthly': SubscriptionTier.ENTERPRISE,
  'prod_enterprise_yearly': SubscriptionTier.ENTERPRISE,
};

// Default subscription period (30 days)
const DEFAULT_SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

@ApiTags('Webhooks')
@Controller('webhooks/creem')
@SkipResponseWrap()
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Creem Webhook handler
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Creem payment webhook' })
  @ApiExcludeEndpoint()
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

    // Verify rawBody exists
    if (!req.rawBody) {
      this.logger.error('Raw body not available for signature verification');
      throw new BadRequestException(
        'Raw body required for signature verification',
      );
    }

    // Verify signature
    const rawBody = req.rawBody.toString();
    if (!this.paymentService.verifyWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const { eventType, object } = parsed.data;
    // metadata.referenceId is used to link to user
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
          const tier = PRODUCT_TO_TIER[productId] || SubscriptionTier.HOBBY;
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
          // Check if this is a quota purchase (non-subscription one-time purchase)
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
   * Parse quota amount from productId
   */
  private parseQuotaAmount(productId: string): number {
    // Example quota pack config (adjust based on actual products)
    const quotaPacks: Record<string, number> = {
      'prod_quota_1000': 1000,
      'prod_quota_5000': 5000,
      'prod_quota_10000': 10000,
      'prod_quota_50000': 50000,
    };
    return quotaPacks[productId] || 0;
  }
}
