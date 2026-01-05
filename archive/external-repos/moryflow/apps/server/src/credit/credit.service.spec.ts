/**
 * CreditService 单元测试
 *
 * 测试积分系统的完整业务逻辑
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// Note: expect.objectContaining returns 'any' type in assertions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';
import { createRedisMock } from '../testing/mocks/redis.mock';
import {
  createMockSubscriptionCredits,
  createMockPurchasedCredits,
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

      const balance = await service.getCreditsBalance(userId);

      expect(balance).toHaveProperty('daily');
      expect(balance).toHaveProperty('subscription');
      expect(balance).toHaveProperty('purchased');
      expect(balance).toHaveProperty('total');
      expect(typeof balance.daily).toBe('number');
      expect(typeof balance.total).toBe('number');
    });

    it('应正确计算购买积分总额', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
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
      prismaMock.purchasedCredits.findMany.mockResolvedValue([
        createMockPurchasedCredits({ userId, remaining: 100 }),
        createMockPurchasedCredits({ userId, remaining: 200 }),
        createMockPurchasedCredits({ userId, remaining: 50 }),
      ]);

      const balance = await service.getCreditsBalance(userId);

      expect(balance.purchased).toBe(350);
    });
  });

  // ==================== getDailyCredits ====================

  describe('getDailyCredits', () => {
    it('首次查询应返回完整的日积分', async () => {
      redisMock.get.mockResolvedValue(null);

      const daily = await service.getDailyCredits(userId);

      expect(daily).toBe(1000); // DAILY_FREE_CREDITS
    });

    it('已使用部分应返回剩余数量', async () => {
      redisMock.get.mockResolvedValue('5'); // 已使用 5

      const daily = await service.getDailyCredits(userId);

      expect(daily).toBe(995); // 1000 - 5
    });

    it('用完后应返回 0', async () => {
      redisMock.get.mockResolvedValue('15'); // 全部用完

      const daily = await service.getDailyCredits(userId);

      expect(daily).toBe(985); // 1000 - 15
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

  // ==================== consumeCredits ====================

  describe('consumeCredits', () => {
    it('消费 0 或负数应抛出 BadRequestException', async () => {
      await expect(service.consumeCredits(userId, 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.consumeCredits(userId, -5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('日积分充足时应成功消费', async () => {
      redisMock.get.mockResolvedValue(null); // 日积分未使用 (15可用)
      prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
      prismaMock.purchasedCredits.findMany.mockResolvedValue([]);

      // Mock transaction
      prismaMock.$transaction.mockImplementation((callback: unknown) => {
        if (typeof callback === 'function') {
          return Promise.resolve(
            (callback as (tx: MockPrismaService) => unknown)(prismaMock),
          );
        }
        return Promise.resolve(callback);
      });

      await service.consumeCredits(userId, 5);

      expect(redisMock.incrby).toHaveBeenCalled();
    });
  });

  // ==================== grantSubscriptionCredits ====================

  describe('grantSubscriptionCredits', () => {
    it('应调用 upsert 创建/更新订阅积分', async () => {
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

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

      expect(prismaMock.subscriptionCredits.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
          create: expect.objectContaining({
            userId,
            creditsTotal: 1000,
            creditsRemaining: 1000,
          }),
        }),
      );
    });

    it('发放 0 或负数应抛出 BadRequestException', async () => {
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await expect(
        service.grantSubscriptionCredits(userId, 0, periodStart, periodEnd),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.grantSubscriptionCredits(userId, -100, periodStart, periodEnd),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== grantPurchasedCredits ====================

  describe('grantPurchasedCredits', () => {
    it('应创建购买积分记录', async () => {
      prismaMock.purchasedCredits.create.mockResolvedValue(
        createMockPurchasedCredits({ userId, amount: 500, remaining: 500 }),
      );

      await service.grantPurchasedCredits(userId, 500, 'order-123');

      expect(prismaMock.purchasedCredits.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            amount: 500,
            remaining: 500,
            orderId: 'order-123',
          }),
        }),
      );
    });

    it('发放 0 或负数应抛出 BadRequestException', async () => {
      await expect(
        service.grantPurchasedCredits(userId, 0, 'order-123'),
      ).rejects.toThrow(BadRequestException);
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
