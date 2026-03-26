import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';
import { DAILY_FREE_CREDITS } from '../config';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';
import { createRedisMock, type MockRedisService } from '../testing';
import {
  createMockCreditDebt,
  createMockPurchasedCredits,
  createMockSubscriptionCredits,
} from '../testing/factories';

describe('CreditService', () => {
  let prismaMock: MockPrismaService;
  let redisMock: MockRedisService;
  let service: CreditService;

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    redisMock = createRedisMock();

    const module = await Test.createTestingModule({
      providers: [
        CreditService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();

    service = module.get(CreditService);
  });

  it('reads daily credits from creditUsageDaily projection', async () => {
    prismaMock.creditUsageDaily.findUnique.mockResolvedValue({
      userId: 'user-1',
      date: new Date().toISOString().slice(0, 10),
      creditsUsedDaily: 8,
      creditsUsedSubscription: 0,
      creditsUsedPurchased: 0,
      requestCount: 1,
      tokenUsed: 100,
    });

    const daily = await service.getDailyCredits('user-1');

    expect(daily).toBe(DAILY_FREE_CREDITS - 8);
  });

  it('preserves higher legacy Redis daily usage during cutover reads', async () => {
    prismaMock.creditUsageDaily.findUnique.mockResolvedValue({
      userId: 'user-1',
      date: new Date().toISOString().slice(0, 10),
      creditsUsedDaily: 8,
      creditsUsedSubscription: 0,
      creditsUsedPurchased: 0,
      requestCount: 1,
      tokenUsed: 100,
    });
    redisMock.get.mockResolvedValue('35');

    const daily = await service.getDailyCredits('user-1');

    expect(daily).toBe(DAILY_FREE_CREDITS - 35);
  });

  it('sums purchased credits from active lots', async () => {
    prismaMock.purchasedCredits.findMany.mockResolvedValue([
      createMockPurchasedCredits({ userId: 'user-1', remaining: 10 }),
      createMockPurchasedCredits({ userId: 'user-1', remaining: 30 }),
    ]);

    const purchased = await service.getPurchasedCredits('user-1');

    expect(purchased).toBe(40);
  });

  it('returns available 0 when user has debt', async () => {
    prismaMock.creditUsageDaily.findUnique.mockResolvedValue(null);
    prismaMock.subscriptionCredits.findUnique.mockResolvedValue(
      createMockSubscriptionCredits({
        userId: 'user-1',
        creditsRemaining: 50,
      }),
    );
    prismaMock.purchasedCredits.findMany.mockResolvedValue([
      createMockPurchasedCredits({ userId: 'user-1', remaining: 25 }),
    ]);
    prismaMock.creditDebt.findUnique.mockResolvedValue(
      createMockCreditDebt({ userId: 'user-1', amount: 20 }),
    );

    const balance = await service.getCreditsBalance('user-1');

    expect(balance.daily).toBe(DAILY_FREE_CREDITS);
    expect(balance.subscription).toBe(50);
    expect(balance.purchased).toBe(25);
    expect(balance.debt).toBe(20);
    expect(balance.available).toBe(0);
  });
});
