/**
 * CreditService 单元测试
 *
 * 测试积分系统的完整业务逻辑
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';
import { DAILY_FREE_CREDITS } from '../config';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';
import { createRedisMock } from '../testing/mocks/redis.mock';
import {
  createMockSubscriptionCredits,
  createMockPurchasedCredits,
  createMockCreditDebt,
} from '../testing/factories';

describe('CreditService', () => {
  let service: CreditService;
  let prismaMock: MockPrismaService;
  let redisMock: ReturnType<typeof createRedisMock>;

  const userId = 'user-123';

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    redisMock = createRedisMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();

    service = module.get<CreditService>(CreditService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== getCreditsBalance ====================

  describe('getCreditsBalance', () => {
    it('应返回包含所有积分类型的余额对象', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
      prismaMock.purchasedCredits.findMany.mockResolvedValue([]);
      prismaMock.creditDebt.findUnique.mockResolvedValue(null);

      const balance = await service.getCreditsBalance(userId);

      expect(balance).toHaveProperty('daily');
      expect(balance).toHaveProperty('subscription');
      expect(balance).toHaveProperty('purchased');
      expect(balance).toHaveProperty('total');
      expect(balance).toHaveProperty('debt');
      expect(balance).toHaveProperty('available');
      expect(typeof balance.daily).toBe('number');
      expect(typeof balance.total).toBe('number');
    });

    it('应正确计算购买积分总额', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
      prismaMock.creditDebt.findUnique.mockResolvedValue(null);
      const purchasedCredits = createMockPurchasedCredits({
        userId,
        remaining: 200,
      });
      prismaMock.purchasedCredits.findMany.mockResolvedValue([
        purchasedCredits,
      ]);

      const balance = await service.getCreditsBalance(userId);

      expect(balance.purchased).toBe(200);
      expect(balance.total).toBeGreaterThanOrEqual(balance.purchased);
    });

    it('应正确累加多条购买积分记录', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
      prismaMock.creditDebt.findUnique.mockResolvedValue(null);
      prismaMock.purchasedCredits.findMany.mockResolvedValue([
        createMockPurchasedCredits({ userId, remaining: 100 }),
        createMockPurchasedCredits({ userId, remaining: 200 }),
        createMockPurchasedCredits({ userId, remaining: 50 }),
      ]);

      const balance = await service.getCreditsBalance(userId);

      expect(balance.purchased).toBe(350);
    });

    it('存在欠费时可用积分应为 0', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
      prismaMock.purchasedCredits.findMany.mockResolvedValue([]);
      prismaMock.creditDebt.findUnique.mockResolvedValue(
        createMockCreditDebt({ userId, amount: 120 }),
      );

      const balance = await service.getCreditsBalance(userId);

      expect(balance.debt).toBe(120);
      expect(balance.available).toBe(0);
    });
  });

  // ==================== getDailyCredits ====================

  describe('getDailyCredits', () => {
    it('首次查询应返回完整的日积分', async () => {
      redisMock.get.mockResolvedValue(null);

      const daily = await service.getDailyCredits(userId);

      expect(daily).toBe(DAILY_FREE_CREDITS);
    });

    it('已使用部分应返回剩余数量', async () => {
      redisMock.get.mockResolvedValue('5'); // 已使用 5

      const daily = await service.getDailyCredits(userId);

      expect(daily).toBe(DAILY_FREE_CREDITS - 5);
    });

    it('用完后应返回 0', async () => {
      redisMock.get.mockResolvedValue(`${DAILY_FREE_CREDITS}`); // 全部用完

      const daily = await service.getDailyCredits(userId);

      expect(daily).toBe(0);
    });

    it('超额使用时应返回 0', async () => {
      redisMock.get.mockResolvedValue('2000');

      const daily = await service.getDailyCredits(userId);

      expect(daily).toBe(0);
    });
  });

  // ==================== getSubscriptionCredits ====================

  describe('getSubscriptionCredits', () => {
    it('无订阅积分应返回 0', async () => {
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);

      const credits = await service.getSubscriptionCredits(userId);

      expect(credits).toBe(0);
    });

    it('有效期内应返回剩余积分', async () => {
      const subCredits = createMockSubscriptionCredits({
        userId,
        creditsRemaining: 500,
        periodStart: new Date(Date.now() - 86400000), // 昨天
        periodEnd: new Date(Date.now() + 86400000 * 29), // 29天后
      });
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(subCredits);

      const credits = await service.getSubscriptionCredits(userId);

      expect(credits).toBe(500);
    });

    it('过期后应返回 0', async () => {
      const expiredCredits = createMockSubscriptionCredits({
        userId,
        creditsRemaining: 500,
        periodStart: new Date(Date.now() - 86400000 * 60), // 60天前
        periodEnd: new Date(Date.now() - 86400000 * 30), // 30天前过期
      });
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(
        expiredCredits,
      );

      const credits = await service.getSubscriptionCredits(userId);

      expect(credits).toBe(0);
    });
  });

  // ==================== consumeCreditsWithDebt ====================

  describe('consumeCreditsWithDebt', () => {
    it('积分充足时不产生欠费', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
      prismaMock.purchasedCredits.findMany.mockResolvedValue([]);
      prismaMock.creditDebt.findUnique.mockResolvedValue(null);
      prismaMock.creditDebt.upsert.mockResolvedValue(
        createMockCreditDebt({ userId, amount: 7 }),
      );

      prismaMock.$transaction.mockImplementation((callback: unknown) => {
        if (typeof callback === 'function') {
          return Promise.resolve(
            (callback as (tx: MockPrismaService) => unknown)(prismaMock),
          );
        }
        return Promise.resolve(callback);
      });

      const result = await service.consumeCreditsWithDebt(userId, 7);

      expect(result.consumed).toBe(7);
      expect(result.debtIncurred).toBe(0);
    });

    it('超出余额应产生欠费', async () => {
      redisMock.get.mockResolvedValue(`${DAILY_FREE_CREDITS - 5}`); // 剩余日积分 5
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
      prismaMock.purchasedCredits.findMany.mockResolvedValue([]);
      prismaMock.creditDebt.findUnique.mockResolvedValue(null);
      prismaMock.creditDebt.upsert.mockResolvedValue(
        createMockCreditDebt({ userId, amount: 7 }),
      );

      prismaMock.$transaction.mockImplementation((callback: unknown) => {
        if (typeof callback === 'function') {
          return Promise.resolve(
            (callback as (tx: MockPrismaService) => unknown)(prismaMock),
          );
        }
        return Promise.resolve(callback);
      });

      const result = await service.consumeCreditsWithDebt(userId, 12);

      expect(result.consumed).toBe(5);
      expect(result.debtIncurred).toBe(7);
      expect(prismaMock.creditDebt.upsert).toHaveBeenCalled();
    });

    it('日积分超额时不应写入负值', async () => {
      redisMock.get.mockResolvedValue('2000');
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(
        createMockSubscriptionCredits({
          userId,
          creditsRemaining: 5,
          periodStart: new Date(Date.now() - 86400000),
          periodEnd: new Date(Date.now() + 86400000),
        }),
      );
      prismaMock.purchasedCredits.findMany.mockResolvedValue([]);
      prismaMock.creditDebt.findUnique.mockResolvedValue(null);

      prismaMock.$transaction.mockImplementation((callback: unknown) => {
        if (typeof callback === 'function') {
          return Promise.resolve(
            (callback as (tx: MockPrismaService) => unknown)(prismaMock),
          );
        }
        return Promise.resolve(callback);
      });

      await service.consumeCreditsWithDebt(userId, 5);

      expect(redisMock.incrby).not.toHaveBeenCalled();
    });
  });

  // ==================== grantSubscriptionCredits ====================

  describe('grantSubscriptionCredits', () => {
    it('应调用 upsert 创建/更新订阅积分', async () => {
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      prismaMock.creditDebt.findUnique.mockResolvedValue(null);
      prismaMock.subscriptionCredits.upsert.mockResolvedValue(
        createMockSubscriptionCredits({
          userId,
          creditsTotal: 1000,
          creditsRemaining: 1000,
        }),
      );

      await service.grantSubscriptionCredits(
        userId,
        1000,
        periodStart,
        periodEnd,
      );

      expect(
        prismaMock.subscriptionCredits.upsert.mock.calls[0]?.[0],
      ).toMatchObject({
        where: { userId },
        create: {
          userId,
          creditsTotal: 1000,
          creditsRemaining: 1000,
        },
      });
    });

    it('应先抵扣欠费再写入订阅积分', async () => {
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      prismaMock.creditDebt.findUnique.mockResolvedValue(
        createMockCreditDebt({ userId, amount: 300 }),
      );
      prismaMock.creditDebt.update.mockResolvedValue(
        createMockCreditDebt({ userId, amount: 0 }),
      );
      prismaMock.subscriptionCredits.upsert.mockResolvedValue(
        createMockSubscriptionCredits({
          userId,
          creditsTotal: 1000,
          creditsRemaining: 700,
        }),
      );

      await service.grantSubscriptionCredits(
        userId,
        1000,
        periodStart,
        periodEnd,
      );

      expect(
        prismaMock.subscriptionCredits.upsert.mock.calls[0]?.[0],
      ).toMatchObject({
        create: {
          creditsRemaining: 700,
        },
        update: {
          creditsRemaining: 700,
        },
      });
    });

    it('发放 0 或负数应抛出 BadRequestException', async () => {
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await expect(
        service.grantSubscriptionCredits(userId, 0, periodStart, periodEnd),
      ).rejects.toThrow('amount must be positive');

      await expect(
        service.grantSubscriptionCredits(userId, -100, periodStart, periodEnd),
      ).rejects.toThrow('amount must be positive');
    });
  });

  // ==================== grantPurchasedCredits ====================

  describe('grantPurchasedCredits', () => {
    it('应创建购买积分记录', async () => {
      prismaMock.creditDebt.findUnique.mockResolvedValue(null);
      prismaMock.purchasedCredits.create.mockResolvedValue(
        createMockPurchasedCredits({ userId, amount: 500, remaining: 500 }),
      );

      await service.grantPurchasedCredits(userId, 500, 'order-123');

      expect(
        prismaMock.purchasedCredits.create.mock.calls[0]?.[0],
      ).toMatchObject({
        data: {
          userId,
          amount: 500,
          remaining: 500,
          orderId: 'order-123',
        },
      });
    });

    it('应先抵扣欠费再创建购买积分', async () => {
      prismaMock.creditDebt.findUnique.mockResolvedValue(
        createMockCreditDebt({ userId, amount: 200 }),
      );
      prismaMock.creditDebt.update.mockResolvedValue(
        createMockCreditDebt({ userId, amount: 0 }),
      );
      prismaMock.purchasedCredits.create.mockResolvedValue(
        createMockPurchasedCredits({ userId, amount: 500, remaining: 300 }),
      );

      await service.grantPurchasedCredits(userId, 500, 'order-123');

      expect(
        prismaMock.purchasedCredits.create.mock.calls[0]?.[0],
      ).toMatchObject({
        data: {
          remaining: 300,
        },
      });
    });

    it('发放 0 或负数应抛出 BadRequestException', async () => {
      await expect(
        service.grantPurchasedCredits(userId, 0, 'order-123'),
      ).rejects.toThrow('amount must be positive');
    });
  });

  // ==================== hasCreditsBeenGranted ====================

  describe('hasCreditsBeenGranted', () => {
    it('订单已存在积分时应返回 true', async () => {
      prismaMock.purchasedCredits.findFirst.mockResolvedValue(
        createMockPurchasedCredits({ orderId: 'order-123' }),
      );

      const result = await service.hasCreditsBeenGranted('order-123');

      expect(result).toBe(true);
    });

    it('订单无积分时应返回 false', async () => {
      prismaMock.purchasedCredits.findFirst.mockResolvedValue(null);

      const result = await service.hasCreditsBeenGranted('order-123');

      expect(result).toBe(false);
    });
  });
});
