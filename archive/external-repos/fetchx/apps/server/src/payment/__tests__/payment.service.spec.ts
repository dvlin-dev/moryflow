/**
 * PaymentService 单元测试
 * 测试支付相关业务逻辑（Creem 集成）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentService } from '../payment.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import { SubscriptionTier, SubscriptionStatus } from '../../../generated/prisma/client';
import { TIER_MONTHLY_QUOTA } from '../payment.constants';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPrisma: {
    subscription: {
      upsert: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    quota: {
      upsert: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    paymentOrder: {
      create: ReturnType<typeof vi.fn>;
    };
    quotaTransaction: {
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockConfig: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      subscription: {
        upsert: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      quota: {
        upsert: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      paymentOrder: {
        create: vi.fn(),
      },
      quotaTransaction: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    mockConfig = {
      get: vi.fn(),
    };

    service = new PaymentService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
    );
  });

  // ============ 订阅激活 ============

  describe('handleSubscriptionActivated', () => {
    const mockParams = {
      userId: 'user_1',
      creemCustomerId: 'creem_cust_1',
      creemSubscriptionId: 'creem_sub_1',
      tier: SubscriptionTier.PRO,
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2024-02-01'),
    };

    it('should upsert subscription with correct data', async () => {
      await service.handleSubscriptionActivated(mockParams);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        create: expect.objectContaining({
          userId: 'user_1',
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          creemCustomerId: 'creem_cust_1',
          creemSubscriptionId: 'creem_sub_1',
        }),
        update: expect.objectContaining({
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
        }),
      });
    });

    it('should upsert quota with tier limit', async () => {
      await service.handleSubscriptionActivated(mockParams);

      expect(mockPrisma.quota.upsert).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        create: expect.objectContaining({
          userId: 'user_1',
          monthlyLimit: TIER_MONTHLY_QUOTA.PRO, // 20000
          monthlyUsed: 0,
        }),
        update: expect.objectContaining({
          monthlyLimit: TIER_MONTHLY_QUOTA.PRO,
          monthlyUsed: 0,
        }),
      });
    });

    it('should run in a transaction', async () => {
      await service.handleSubscriptionActivated(mockParams);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should set correct monthly limit for each tier', async () => {
      const tiers: SubscriptionTier[] = ['FREE', 'BASIC', 'PRO', 'TEAM'];

      for (const tier of tiers) {
        mockPrisma.quota.upsert.mockClear();

        await service.handleSubscriptionActivated({
          ...mockParams,
          tier,
        });

        expect(mockPrisma.quota.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              monthlyLimit: TIER_MONTHLY_QUOTA[tier],
            }),
          }),
        );
      }
    });
  });

  // ============ 订阅取消 ============

  describe('handleSubscriptionCanceled', () => {
    it('should update subscription status to CANCELED', async () => {
      await service.handleSubscriptionCanceled('user_1');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        data: {
          status: SubscriptionStatus.CANCELED,
          cancelAtPeriodEnd: true,
        },
      });
    });
  });

  // ============ 订阅过期 ============

  describe('handleSubscriptionExpired', () => {
    it('should reset subscription to FREE tier', async () => {
      await service.handleSubscriptionExpired('user_1');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        data: {
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.EXPIRED,
        },
      });
    });

    it('should reset quota to FREE tier limit', async () => {
      await service.handleSubscriptionExpired('user_1');

      expect(mockPrisma.quota.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_1' },
          data: expect.objectContaining({
            monthlyLimit: TIER_MONTHLY_QUOTA.FREE, // 100
            monthlyUsed: 0,
          }),
        }),
      );
    });

    it('should run in a transaction', async () => {
      await service.handleSubscriptionExpired('user_1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ============ 配额购买 ============

  describe('handleQuotaPurchase', () => {
    const mockPurchase = {
      userId: 'user_1',
      amount: 1000,
      creemOrderId: 'order_123',
      price: 9900, // $99.00 in cents
    };

    it('should increment purchased quota', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ purchasedQuota: 500 });

      await service.handleQuotaPurchase(mockPurchase);

      expect(mockPrisma.quota.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_1' },
          update: {
            purchasedQuota: { increment: 1000 },
          },
        }),
      );
    });

    it('should create payment order record', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ purchasedQuota: 0 });

      await service.handleQuotaPurchase(mockPurchase);

      expect(mockPrisma.paymentOrder.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_1',
          creemOrderId: 'order_123',
          type: 'quota_purchase',
          amount: 9900,
          status: 'completed',
          quotaAmount: 1000,
        },
      });
    });

    it('should create quota transaction with correct balance', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue({ purchasedQuota: 500 });

      await service.handleQuotaPurchase(mockPurchase);

      expect(mockPrisma.quotaTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          type: 'PURCHASE',
          amount: 1000,
          source: 'PURCHASED',
          balanceBefore: 500,
          balanceAfter: 1500,
          reason: 'Order: order_123',
        }),
      });
    });

    it('should handle first purchase (no existing quota)', async () => {
      mockPrisma.quota.findUnique.mockResolvedValue(null);

      await service.handleQuotaPurchase(mockPurchase);

      expect(mockPrisma.quotaTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          balanceBefore: 0,
          balanceAfter: 1000,
        }),
      });
    });
  });

  // ============ 初始化用户配额 ============

  describe('initializeUserQuota', () => {
    it('should create FREE subscription for new user', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await service.initializeUserQuota('new_user');

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'new_user',
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        }),
      });
    });

    it('should create quota with FREE tier limit', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await service.initializeUserQuota('new_user');

      expect(mockPrisma.quota.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'new_user',
          monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
          monthlyUsed: 0,
        }),
      });
    });

    it('should skip if user already has subscription (idempotent)', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: 'existing' });

      await service.initializeUserQuota('existing_user');

      expect(mockPrisma.subscription.create).not.toHaveBeenCalled();
      expect(mockPrisma.quota.create).not.toHaveBeenCalled();
    });
  });

  // ============ Webhook 签名验证 ============

  describe('verifyWebhookSignature', () => {
    const mockSecret = 'webhook_secret_123';
    const mockPayload = '{"event":"subscription.activated"}';

    beforeEach(() => {
      mockConfig.get.mockReturnValue(mockSecret);
    });

    it('should return true for valid signature', () => {
      // Generate correct signature using HMAC-SHA256
      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', mockSecret)
        .update(mockPayload, 'utf8')
        .digest('hex');

      const result = service.verifyWebhookSignature(mockPayload, validSignature);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const result = service.verifyWebhookSignature(mockPayload, 'invalid_signature');

      expect(result).toBe(false);
    });

    it('should return false when secret is missing', () => {
      mockConfig.get.mockReturnValue(undefined);

      const result = service.verifyWebhookSignature(mockPayload, 'any_signature');

      expect(result).toBe(false);
    });

    it('should return false when signature is empty', () => {
      const result = service.verifyWebhookSignature(mockPayload, '');

      expect(result).toBe(false);
    });

    it('should return false for signature with wrong length', () => {
      const result = service.verifyWebhookSignature(mockPayload, 'abc123');

      expect(result).toBe(false);
    });

    it('should handle malformed hex signatures', () => {
      // Non-hex characters
      const result = service.verifyWebhookSignature(mockPayload, 'not_valid_hex_string_at_all!!');

      expect(result).toBe(false);
    });
  });
});
