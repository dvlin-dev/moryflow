/**
 * PaymentWebhookController 单元测试
 * 覆盖签名校验、幂等去重、商品校验与配额购买
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request } from 'express';
import { PaymentWebhookController } from '../payment-webhook.controller';
import type { PaymentService } from '../payment.service';
import type { CreemWebhookPayload } from '../dto';

describe('PaymentWebhookController', () => {
  let controller: PaymentWebhookController;
  let paymentService: {
    verifyWebhookSignature: ReturnType<typeof vi.fn>;
    recordWebhookEvent: ReturnType<typeof vi.fn>;
    handleSubscriptionActivated: ReturnType<typeof vi.fn>;
    handleSubscriptionCanceled: ReturnType<typeof vi.fn>;
    handleSubscriptionExpired: ReturnType<typeof vi.fn>;
    handleQuotaPurchase: ReturnType<typeof vi.fn>;
  };

  const basePayload: CreemWebhookPayload = {
    id: 'evt_1',
    eventType: 'subscription.active',
    created_at: 1710000000,
    object: {
      id: 'sub_1',
      product: { id: 'prod_basic_monthly' },
      customer: { id: 'cust_1' },
      metadata: { referenceId: 'user_1' },
      current_period_start_date: '2024-01-01T00:00:00Z',
      current_period_end_date: '2024-02-01T00:00:00Z',
    },
  };

  beforeEach(() => {
    paymentService = {
      verifyWebhookSignature: vi.fn().mockReturnValue(true),
      recordWebhookEvent: vi.fn().mockResolvedValue(true),
      handleSubscriptionActivated: vi.fn(),
      handleSubscriptionCanceled: vi.fn(),
      handleSubscriptionExpired: vi.fn(),
      handleQuotaPurchase: vi.fn(),
    };

    controller = new PaymentWebhookController(
      paymentService as unknown as PaymentService,
    );
  });

  it('should reject invalid signature', async () => {
    paymentService.verifyWebhookSignature.mockReturnValue(false);

    const req = {
      rawBody: Buffer.from('raw'),
    } as Request & { rawBody?: Buffer };

    await expect(
      controller.handleWebhook(req, basePayload, 'invalid'),
    ).rejects.toThrow('Invalid webhook signature');
  });

  it('should skip duplicate events', async () => {
    paymentService.recordWebhookEvent.mockResolvedValue(false);

    const req = {
      rawBody: Buffer.from('raw'),
    } as Request & { rawBody?: Buffer };

    const result = await controller.handleWebhook(req, basePayload, 'sig');

    expect(result).toEqual({ received: true });
    expect(paymentService.handleSubscriptionActivated).not.toHaveBeenCalled();
  });

  it('should ignore unknown subscription product', async () => {
    const req = {
      rawBody: Buffer.from('raw'),
    } as Request & { rawBody?: Buffer };

    const payload: CreemWebhookPayload = {
      ...basePayload,
      object: { ...basePayload.object, product: { id: 'unknown_product' } },
    };

    await controller.handleWebhook(req, payload, 'sig');

    expect(paymentService.handleSubscriptionActivated).not.toHaveBeenCalled();
  });

  it('should handle valid quota purchase', async () => {
    const req = {
      rawBody: Buffer.from('raw'),
    } as Request & { rawBody?: Buffer };

    const payload: CreemWebhookPayload = {
      id: 'evt_2',
      eventType: 'checkout.completed',
      created_at: 1710000000,
      object: {
        id: 'checkout_1',
        product: { id: 'prod_quota_1000' },
        order: { id: 'order_1', amount: 9900, currency: 'USD' },
        metadata: { referenceId: 'user_1' },
      },
    };

    await controller.handleWebhook(req, payload, 'sig');

    expect(paymentService.handleQuotaPurchase).toHaveBeenCalledWith({
      userId: 'user_1',
      amount: 1000,
      creemOrderId: 'order_1',
      price: 9900,
      currency: 'USD',
    });
  });

  it('should ignore quota purchase with price mismatch', async () => {
    const req = {
      rawBody: Buffer.from('raw'),
    } as Request & { rawBody?: Buffer };

    const payload: CreemWebhookPayload = {
      id: 'evt_3',
      eventType: 'checkout.completed',
      created_at: 1710000000,
      object: {
        id: 'checkout_2',
        product: { id: 'prod_quota_1000' },
        order: { id: 'order_2', amount: 10000, currency: 'USD' },
        metadata: { referenceId: 'user_1' },
      },
    };

    await controller.handleWebhook(req, payload, 'sig');

    expect(paymentService.handleQuotaPurchase).not.toHaveBeenCalled();
  });

  it('should reject when rawBody is missing', async () => {
    const req = {} as Request & { rawBody?: Buffer };

    await expect(
      controller.handleWebhook(req, basePayload, 'sig'),
    ).rejects.toThrow('Raw body required for signature verification');
  });
});
