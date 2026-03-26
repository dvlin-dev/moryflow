import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { CreditLedgerService } from './credit-ledger.service';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';
import {
  createPrismaMock,
  createRedisMock,
  type MockRedisService,
  type MockPrismaService,
} from '../testing';
import {
  createMockPurchasedCredits,
  createMockSubscriptionCredits,
} from '../testing/factories';

describe('CreditLedgerService', () => {
  let prismaMock: MockPrismaService;
  let redisMock: MockRedisService;
  let service: CreditLedgerService;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-26T08:00:00.000Z'));

    prismaMock = createPrismaMock();
    redisMock = createRedisMock();
    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
        if (typeof callback === 'function') {
          return callback(prismaMock);
        }
        return callback;
      },
    );

    const module = await Test.createTestingModule({
      providers: [
        CreditLedgerService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();

    service = module.get(CreditLedgerService);
  });

  it('consumes daily, subscription, and purchased credits in order for AI chat', async () => {
    prismaMock.creditUsageDaily.findUnique.mockResolvedValue({
      userId: 'user-1',
      date: '2026-03-26',
      creditsUsedDaily: 98,
      creditsUsedSubscription: 0,
      creditsUsedPurchased: 0,
      requestCount: 0,
      tokenUsed: 0,
    });
    prismaMock.subscriptionCredits.findUnique.mockResolvedValue(
      createMockSubscriptionCredits({
        userId: 'user-1',
        creditsRemaining: 3,
      }),
    );
    prismaMock.purchasedCredits.findMany.mockResolvedValue([
      createMockPurchasedCredits({
        id: 'purchase-1',
        userId: 'user-1',
        remaining: 10,
      }),
    ]);

    prismaMock.creditLedgerEntry.create.mockResolvedValue({
      id: 'ledger-1',
      userId: 'user-1',
      eventType: 'AI_CHAT',
      direction: 'DEBIT',
      status: 'APPLIED',
      anomalyCode: null,
      creditsDelta: -7,
      computedCredits: 7,
      appliedCredits: 7,
      debtDelta: 0,
      summary: 'Chat completion',
      detailsJson: null,
      errorMessage: null,
      requestId: 'req-1',
      chatId: 'chat-1',
      runId: null,
      idempotencyKey: 'ai-chat:1',
      modelId: 'membership:openai/gpt-5.4',
      providerId: 'openai',
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      inputPriceSnapshot: 1,
      outputPriceSnapshot: 2,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0.003,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    const result = await service.recordAiChatSettlement({
      userId: 'user-1',
      summary: 'Chat completion',
      idempotencyKey: 'ai-chat:1',
      requestId: 'req-1',
      chatId: 'chat-1',
      modelId: 'membership:openai/gpt-5.4',
      providerId: 'openai',
      promptTokens: 100,
      completionTokens: 20,
      totalTokens: 120,
      inputPriceSnapshot: 1,
      outputPriceSnapshot: 2,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0.003,
      computedCredits: 7,
    });

    expect(result.status).toBe('APPLIED');
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.creditLedgerEntry.create).toHaveBeenCalled();
    expect(prismaMock.creditLedgerAllocation.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ bucketType: 'DAILY', amount: -2 }),
          expect.objectContaining({ bucketType: 'SUBSCRIPTION', amount: -3 }),
          expect.objectContaining({
            bucketType: 'PURCHASED',
            amount: -2,
            sourcePurchasedCreditsId: 'purchase-1',
          }),
        ]),
      }),
    );
    expect(prismaMock.creditUsageDaily.upsert).toHaveBeenCalled();
  });

  it('repays debt before granting purchased credits', async () => {
    prismaMock.creditDebt.findUnique.mockResolvedValue({
      userId: 'user-1',
      amount: 30,
      createdAt: new Date('2026-03-25T00:00:00.000Z'),
      updatedAt: new Date('2026-03-25T00:00:00.000Z'),
    });
    prismaMock.creditLedgerEntry.create.mockResolvedValue({
      id: 'ledger-2',
      userId: 'user-1',
      eventType: 'PURCHASED_GRANT',
      direction: 'CREDIT',
      status: 'APPLIED',
      anomalyCode: null,
      creditsDelta: 70,
      computedCredits: 100,
      appliedCredits: 70,
      debtDelta: -30,
      summary: 'Credits purchase',
      detailsJson: null,
      errorMessage: null,
      requestId: null,
      chatId: null,
      runId: null,
      idempotencyKey: 'grant:1',
      modelId: null,
      providerId: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      inputPriceSnapshot: null,
      outputPriceSnapshot: null,
      creditsPerDollarSnapshot: null,
      profitMultiplierSnapshot: null,
      costUsd: null,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    const result = await service.grantPurchasedCredits({
      userId: 'user-1',
      amount: 100,
      summary: 'Credits purchase',
      eventType: 'PURCHASED_GRANT',
      idempotencyKey: 'grant:1',
      orderId: 'order-1',
    });

    expect(result.appliedCredits).toBe(70);
    expect(result.debtDelta).toBe(-30);
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.creditDebt.update).toHaveBeenCalled();
    expect(prismaMock.purchasedCredits.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          amount: 100,
          remaining: 70,
          orderId: 'order-1',
        }),
      }),
    );
  });

  it('marks zero-credit AI settlements with token usage as skipped anomalies', async () => {
    prismaMock.creditLedgerEntry.create.mockResolvedValue({
      id: 'ledger-3',
      userId: 'user-1',
      eventType: 'AI_CHAT',
      direction: 'NEUTRAL',
      status: 'SKIPPED',
      anomalyCode: 'ZERO_CREDITS_WITH_USAGE',
      creditsDelta: 0,
      computedCredits: 0,
      appliedCredits: 0,
      debtDelta: 0,
      summary: 'Chat completion',
      detailsJson: null,
      errorMessage: null,
      requestId: null,
      chatId: 'chat-2',
      runId: null,
      idempotencyKey: 'ai-chat:2',
      modelId: 'membership:openai/gpt-5.4',
      providerId: 'openai',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      inputPriceSnapshot: 0,
      outputPriceSnapshot: 0,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    const result = await service.recordAiChatSettlement({
      userId: 'user-1',
      summary: 'Chat completion',
      idempotencyKey: 'ai-chat:2',
      chatId: 'chat-2',
      modelId: 'membership:openai/gpt-5.4',
      providerId: 'openai',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      inputPriceSnapshot: 0,
      outputPriceSnapshot: 0,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0,
      computedCredits: 0,
    });

    expect(result.status).toBe('SKIPPED');
    expect(result.anomalyCode).toBe('ZERO_CREDITS_WITH_USAGE');
    expect(prismaMock.creditLedgerAllocation.createMany).not.toHaveBeenCalled();
  });

  it('does not flag priced AI image settlements without tokens as zero-usage anomalies', async () => {
    prismaMock.creditUsageDaily.findUnique.mockResolvedValue(null);
    prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
    prismaMock.purchasedCredits.findMany.mockResolvedValue([]);
    prismaMock.creditLedgerEntry.create.mockResolvedValue({
      id: 'ledger-4',
      userId: 'user-1',
      eventType: 'AI_IMAGE',
      direction: 'DEBIT',
      status: 'APPLIED',
      anomalyCode: null,
      creditsDelta: -5,
      computedCredits: 5,
      appliedCredits: 5,
      debtDelta: 0,
      summary: 'Image generation',
      detailsJson: { imageCount: 1 },
      errorMessage: null,
      requestId: null,
      chatId: null,
      runId: null,
      idempotencyKey: 'ai-image:1',
      modelId: 'z-image-turbo',
      providerId: 'fal',
      promptTokens: null,
      completionTokens: null,
      totalTokens: 0,
      inputPriceSnapshot: 0.005,
      outputPriceSnapshot: 0,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0.005,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    const result = await service.recordAiImageSettlement({
      userId: 'user-1',
      summary: 'Image generation',
      idempotencyKey: 'ai-image:1',
      modelId: 'z-image-turbo',
      providerId: 'fal',
      totalTokens: 0,
      inputPriceSnapshot: 0.005,
      outputPriceSnapshot: 0,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0.005,
      computedCredits: 5,
      detailsJson: { imageCount: 1 },
    });

    expect(result.status).toBe('APPLIED');
    expect(result.anomalyCode).toBeNull();
  });

  it('classifies zero-priced AI image settlements as ZERO_PRICE_CONFIG', async () => {
    prismaMock.creditLedgerEntry.create.mockResolvedValue({
      id: 'ledger-4b',
      userId: 'user-1',
      eventType: 'AI_IMAGE',
      direction: 'NEUTRAL',
      status: 'SKIPPED',
      anomalyCode: 'ZERO_PRICE_CONFIG',
      creditsDelta: 0,
      computedCredits: 0,
      appliedCredits: 0,
      debtDelta: 0,
      summary: 'Image generation',
      detailsJson: { imageCount: 1 },
      errorMessage: null,
      requestId: null,
      chatId: null,
      runId: null,
      idempotencyKey: 'ai-image:zero-price',
      modelId: 'z-image-free',
      providerId: 'fal',
      promptTokens: null,
      completionTokens: null,
      totalTokens: 0,
      inputPriceSnapshot: 0,
      outputPriceSnapshot: 0,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    await service.recordAiImageSettlement({
      userId: 'user-1',
      summary: 'Image generation',
      idempotencyKey: 'ai-image:zero-price',
      modelId: 'z-image-free',
      providerId: 'fal',
      totalTokens: 0,
      inputPriceSnapshot: 0,
      outputPriceSnapshot: 0,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0,
      computedCredits: 0,
      detailsJson: { imageCount: 1 },
    });

    expect(prismaMock.creditLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          anomalyCode: 'ZERO_PRICE_CONFIG',
        }),
      }),
    );
  });

  it('uses legacy Redis daily usage as the debit baseline during cutover', async () => {
    redisMock.get.mockResolvedValue('95');
    prismaMock.creditUsageDaily.findUnique.mockResolvedValue(null);
    prismaMock.subscriptionCredits.findUnique.mockResolvedValue(null);
    prismaMock.purchasedCredits.findMany.mockResolvedValue([]);
    prismaMock.creditLedgerEntry.create.mockResolvedValue({
      id: 'ledger-legacy-daily-1',
      userId: 'user-1',
      eventType: 'AI_CHAT',
      direction: 'DEBIT',
      status: 'APPLIED',
      anomalyCode: null,
      creditsDelta: -5,
      computedCredits: 10,
      appliedCredits: 5,
      debtDelta: 5,
      summary: 'Chat completion',
      detailsJson: null,
      errorMessage: null,
      requestId: null,
      chatId: 'chat-legacy-1',
      runId: null,
      idempotencyKey: 'ai-chat:legacy-1',
      modelId: 'membership:openai/gpt-5.4',
      providerId: 'openai',
      promptTokens: 80,
      completionTokens: 20,
      totalTokens: 100,
      inputPriceSnapshot: 1,
      outputPriceSnapshot: 2,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0.003,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    const result = await service.recordAiChatSettlement({
      userId: 'user-1',
      summary: 'Chat completion',
      idempotencyKey: 'ai-chat:legacy-1',
      chatId: 'chat-legacy-1',
      modelId: 'membership:openai/gpt-5.4',
      providerId: 'openai',
      promptTokens: 80,
      completionTokens: 20,
      totalTokens: 100,
      inputPriceSnapshot: 1,
      outputPriceSnapshot: 2,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0.003,
      computedCredits: 10,
    });

    expect(result.appliedCredits).toBe(5);
    expect(result.debtDelta).toBe(5);
    expect(prismaMock.creditLedgerAllocation.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ bucketType: 'DAILY', amount: -5 }),
          expect.objectContaining({ bucketType: 'DEBT', amount: 5 }),
        ]),
      }),
    );
  });

  it('preserves attempted computed credits on failed AI settlement rows', async () => {
    prismaMock.creditLedgerEntry.create.mockResolvedValue({
      id: 'ledger-failed-1',
      userId: 'user-1',
      eventType: 'AI_CHAT',
      direction: 'NEUTRAL',
      status: 'FAILED',
      anomalyCode: 'SETTLEMENT_FAILED',
      creditsDelta: 0,
      computedCredits: 9,
      appliedCredits: 0,
      debtDelta: 0,
      summary: 'Chat completion',
      detailsJson: null,
      errorMessage: 'write failed',
      requestId: 'req-1',
      chatId: 'chat-1',
      runId: null,
      idempotencyKey: 'ai-chat:failed-1',
      modelId: 'membership:openai/gpt-5.4',
      providerId: 'openai',
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 150,
      inputPriceSnapshot: 1,
      outputPriceSnapshot: 2,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0.0045,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    const result = await service.recordAiSettlementFailure({
      userId: 'user-1',
      eventType: 'AI_CHAT',
      summary: 'Chat completion',
      idempotencyKey: 'ai-chat:failed-1',
      requestId: 'req-1',
      chatId: 'chat-1',
      modelId: 'membership:openai/gpt-5.4',
      providerId: 'openai',
      promptTokens: 120,
      completionTokens: 30,
      totalTokens: 150,
      inputPriceSnapshot: 1,
      outputPriceSnapshot: 2,
      creditsPerDollarSnapshot: 1000,
      profitMultiplierSnapshot: 2,
      costUsd: 0.0045,
      computedCredits: 9,
      errorMessage: 'write failed',
    } as never);

    expect(result.status).toBe('FAILED');
    expect(prismaMock.creditLedgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          computedCredits: 9,
        }),
      }),
    );
  });

  it('treats duplicate subscription admin grants as idempotent replays', async () => {
    prismaMock.creditLedgerEntry.create.mockRejectedValue({ code: 'P2002' });
    prismaMock.creditLedgerEntry.findUnique.mockResolvedValue({
      id: 'ledger-replay-subscription-1',
      userId: 'user-1',
      eventType: 'ADMIN_GRANT',
      direction: 'CREDIT',
      status: 'APPLIED',
      anomalyCode: null,
      creditsDelta: 100,
      computedCredits: 100,
      appliedCredits: 100,
      debtDelta: 0,
      summary: 'Admin subscription credit grant',
      detailsJson: { operatorId: 'admin-1', reason: 'manual_admin_grant' },
      errorMessage: null,
      requestId: null,
      chatId: null,
      runId: null,
      idempotencyKey: 'admin:admin-1:user-1:subscription:100:nonce-1',
      modelId: null,
      providerId: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      inputPriceSnapshot: null,
      outputPriceSnapshot: null,
      creditsPerDollarSnapshot: null,
      profitMultiplierSnapshot: null,
      costUsd: null,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    const result = await service.grantAdminCredits({
      type: 'subscription',
      userId: 'user-1',
      amount: 100,
      summary: 'Admin subscription credit grant',
      reason: 'manual_admin_grant',
      periodStart: new Date('2026-03-26T08:00:00.000Z'),
      periodEnd: new Date('2026-04-26T08:00:00.000Z'),
      idempotencyKey: 'admin:admin-1:user-1:subscription:100:nonce-1',
      detailsJson: { operatorId: 'admin-1' },
    });

    expect(result).toMatchObject({
      id: 'ledger-replay-subscription-1',
      status: 'APPLIED',
      appliedCredits: 100,
    });
    expect(prismaMock.creditLedgerEntry.findUnique).toHaveBeenCalledWith({
      where: {
        idempotencyKey: 'admin:admin-1:user-1:subscription:100:nonce-1',
      },
    });
  });

  it('treats duplicate purchased admin grants as idempotent replays', async () => {
    prismaMock.creditLedgerEntry.create.mockRejectedValue({ code: 'P2002' });
    prismaMock.creditLedgerEntry.findUnique.mockResolvedValue({
      id: 'ledger-replay-purchased-1',
      userId: 'user-1',
      eventType: 'ADMIN_GRANT',
      direction: 'CREDIT',
      status: 'APPLIED',
      anomalyCode: null,
      creditsDelta: 50,
      computedCredits: 50,
      appliedCredits: 50,
      debtDelta: 0,
      summary: 'Admin purchased credit grant',
      detailsJson: { operatorId: 'admin-1', reason: 'manual_admin_grant' },
      errorMessage: null,
      requestId: null,
      chatId: null,
      runId: null,
      idempotencyKey: 'admin:admin-1:user-1:purchased:50:nonce-2',
      modelId: null,
      providerId: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      inputPriceSnapshot: null,
      outputPriceSnapshot: null,
      creditsPerDollarSnapshot: null,
      profitMultiplierSnapshot: null,
      costUsd: null,
      createdAt: new Date('2026-03-26T08:00:00.000Z'),
      updatedAt: new Date('2026-03-26T08:00:00.000Z'),
    } as never);

    const result = await service.grantAdminCredits({
      type: 'purchased',
      userId: 'user-1',
      amount: 50,
      summary: 'Admin purchased credit grant',
      reason: 'manual_admin_grant',
      idempotencyKey: 'admin:admin-1:user-1:purchased:50:nonce-2',
      detailsJson: { operatorId: 'admin-1' },
    });

    expect(result).toMatchObject({
      id: 'ledger-replay-purchased-1',
      status: 'APPLIED',
      appliedCredits: 50,
    });
    expect(prismaMock.creditLedgerEntry.findUnique).toHaveBeenCalledWith({
      where: {
        idempotencyKey: 'admin:admin-1:user-1:purchased:50:nonce-2',
      },
    });
  });

  it('rethrows duplicate idempotency errors when operating inside a caller transaction', async () => {
    prismaMock.creditLedgerEntry.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.grantPurchasedCredits({
        userId: 'user-1',
        amount: 50,
        summary: 'Credit pack purchase',
        eventType: 'PURCHASED_GRANT',
        idempotencyKey: 'checkout:checkout-1',
        orderId: 'order-1',
        transactionClient: prismaMock as never,
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    expect(prismaMock.creditLedgerEntry.findUnique).not.toHaveBeenCalled();
  });
});
