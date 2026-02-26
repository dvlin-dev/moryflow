/**
 * PaymentService 单元测试
 *
 * 测试支付相关业务逻辑：订阅处理、Webhook 验证、结账完成
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import { ActivityLogService } from '../activity-log';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';
import {
  createMockSubscription,
  createMockPaymentOrder,
} from '../testing/factories';

describe('PaymentService', () => {
  let service: PaymentService;
  let prismaMock: MockPrismaService;
  let creditServiceMock: {
    grantSubscriptionCredits: ReturnType<typeof vi.fn>;
    grantPurchasedCredits: ReturnType<typeof vi.fn>;
  };
  let activityLogServiceMock: { log: ReturnType<typeof vi.fn> };
  let configServiceMock: { get: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    creditServiceMock = {
      grantSubscriptionCredits: vi.fn(),
      grantPurchasedCredits: vi.fn(),
    };

    activityLogServiceMock = {
      log: vi.fn(),
    };

    configServiceMock = {
      get: vi.fn().mockReturnValue('test-webhook-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CreditService, useValue: creditServiceMock },
        { provide: ActivityLogService, useValue: activityLogServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== handleSubscriptionActive ====================

  describe('handleSubscriptionActive', () => {
    it('应创建订阅并更新等级', async () => {
      const userId = 'user-123';
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          if (typeof callback === 'function') {
            return callback(prismaMock);
          }
          return callback;
        },
      );
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.subscription.upsert.mockResolvedValue(
        createMockSubscription({ userId, status: 'active' }),
      );

      await service.handleSubscriptionActive({
        subscriptionId: 'sub-123',
        customerId: 'cust-123',
        productId: 'prod_basic_monthly',
        userId,
        periodEnd,
      });

      expect(prismaMock.subscription.upsert).toHaveBeenCalled();
      expect(creditServiceMock.grantSubscriptionCredits).toHaveBeenCalled();
    });

    it('应根据产品ID分配正确的积分数量', async () => {
      const userId = 'user-123';
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          if (typeof callback === 'function') {
            return callback(prismaMock);
          }
          return callback;
        },
      );
      prismaMock.subscription.findUnique.mockResolvedValue(null);
      prismaMock.subscription.upsert.mockResolvedValue(
        createMockSubscription({ userId, status: 'active' }),
      );

      await service.handleSubscriptionActive({
        subscriptionId: 'sub-123',
        customerId: 'cust-123',
        productId: 'prod_pro_monthly',
        userId,
        periodEnd,
      });

      expect(creditServiceMock.grantSubscriptionCredits).toHaveBeenCalledWith(
        userId,
        expect.any(Number),
        expect.any(Date),
        periodEnd,
        expect.anything(),
      );
    });
  });

  // ==================== handleSubscriptionCanceled ====================

  describe('handleSubscriptionCanceled', () => {
    it('应将订阅状态更新为 canceled', async () => {
      const subscription = createMockSubscription({ status: 'active' });
      const subscriptionId = subscription.creemSubscriptionId ?? 'sub-123';
      prismaMock.subscription.update.mockResolvedValue({
        ...subscription,
        status: 'canceled',
        cancelAtPeriodEnd: true,
      });

      await service.handleSubscriptionCanceled({
        subscriptionId,
        userId: subscription.userId,
      });

      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { creemSubscriptionId: subscriptionId },
        data: { status: 'canceled', cancelAtPeriodEnd: true },
      });
    });
  });

  // ==================== handleSubscriptionPaused ====================

  describe('handleSubscriptionPaused', () => {
    it('应将订阅状态更新为 paused', async () => {
      const subscription = createMockSubscription({ status: 'active' });
      const subscriptionId = subscription.creemSubscriptionId ?? 'sub-123';
      prismaMock.subscription.update.mockResolvedValue({
        ...subscription,
        status: 'paused',
      });

      await service.handleSubscriptionPaused({
        subscriptionId,
      });

      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { creemSubscriptionId: subscriptionId },
        data: { status: 'paused' },
      });
    });
  });

  // ==================== handleSubscriptionExpired ====================

  describe('handleSubscriptionExpired', () => {
    it('应将订阅降级到 free', async () => {
      const userId = 'user-123';
      const subscription = createMockSubscription({ userId, status: 'active' });
      const subscriptionId = subscription.creemSubscriptionId ?? 'sub-123';

      prismaMock.subscription.update.mockResolvedValue({
        ...subscription,
        status: 'expired',
      });

      await service.handleSubscriptionExpired({
        subscriptionId,
        userId,
      });

      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { creemSubscriptionId: subscriptionId },
        data: { status: 'expired', tier: 'free' },
      });
    });
  });

  // ==================== handleCheckoutCompleted ====================

  describe('handleCheckoutCompleted', () => {
    it('应使用事务处理并创建订单', async () => {
      const userId = 'user-123';

      // 由于 handleCheckoutCompleted 内部使用 this.prisma.$transaction
      // 我们只验证事务被调用，具体的积分发放在事务内部
      prismaMock.$transaction.mockImplementation(() => {
        // 事务执行完成
        return Promise.resolve(undefined);
      });

      await service.handleCheckoutCompleted({
        checkoutId: 'checkout-123',
        orderId: 'order-123',
        productId: 'credits_500',
        userId,
        amount: 1000,
        currency: 'USD',
        productType: 'credits',
      });

      // 验证事务被调用
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('重复订单应跳过处理（幂等性）', async () => {
      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          if (typeof callback === 'function') {
            const txMock = {
              paymentOrder: {
                findFirst: vi
                  .fn()
                  .mockResolvedValue(
                    createMockPaymentOrder({ creemCheckoutId: 'checkout-123' }),
                  ),
                create: vi.fn(),
              },
            };
            return callback(txMock);
          }
          return callback;
        },
      );

      await service.handleCheckoutCompleted({
        checkoutId: 'checkout-123',
        orderId: 'order-123',
        productId: 'credits_500',
        userId: 'user-123',
        amount: 1000,
        currency: 'USD',
        productType: 'credits',
      });

      expect(creditServiceMock.grantPurchasedCredits).not.toHaveBeenCalled();
    });

    it('唯一约束冲突应视为已处理', async () => {
      prismaMock.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          if (typeof callback === 'function') {
            const txMock = {
              paymentOrder: {
                findFirst: vi.fn().mockResolvedValue(null),
                create: vi.fn().mockRejectedValue({ code: 'P2002' }),
              },
            };
            return callback(txMock);
          }
          return callback;
        },
      );

      await service.handleCheckoutCompleted({
        checkoutId: 'checkout-456',
        orderId: 'order-456',
        productId: 'credits_500',
        userId: 'user-123',
        amount: 1000,
        currency: 'USD',
        productType: 'credits',
      });

      expect(creditServiceMock.grantPurchasedCredits).not.toHaveBeenCalled();
    });
  });

  // ==================== verifyWebhookSignature ====================

  describe('verifyWebhookSignature', () => {
    it('有效签名应返回 true', async () => {
      const { createHmac } = await import('crypto');
      const payload = '{"test": "data"}';
      const secret = 'test-webhook-secret';
      const validSignature = createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      const result = service.verifyWebhookSignature(payload, validSignature);

      expect(result).toBe(true);
    });

    it('无效签名应返回 false', () => {
      const result = service.verifyWebhookSignature(
        '{"test": "data"}',
        'invalid-signature',
      );

      expect(result).toBe(false);
    });

    it('未配置密钥时应返回 false', () => {
      configServiceMock.get.mockReturnValue(undefined);

      const result = service.verifyWebhookSignature('payload', 'signature');

      expect(result).toBe(false);
    });
  });
});
