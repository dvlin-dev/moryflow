import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreditLedgerQueryService } from './credit-ledger-query.service';
import {
  createPrismaMock,
  type MockPrismaService,
} from '../testing/mocks/prisma.mock';

describe('CreditLedgerQueryService', () => {
  let prismaMock: MockPrismaService;
  let service: CreditLedgerQueryService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new CreditLedgerQueryService(prismaMock as never);
  });

  it('returns user-scoped ledger history ordered by createdAt desc', async () => {
    prismaMock.creditLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'ledger-1',
        userId: 'user-1',
        eventType: 'AI_CHAT',
        direction: 'DEBIT',
        status: 'APPLIED',
        anomalyCode: null,
        summary: 'Chat completion',
        creditsDelta: -12,
        computedCredits: 12,
        appliedCredits: 12,
        debtDelta: 0,
        promptTokens: 100,
        completionTokens: 40,
        totalTokens: 140,
        modelId: 'membership:openai/gpt-5.4',
        providerId: 'openai',
        detailsJson: null,
        errorMessage: null,
        requestId: null,
        chatId: 'chat-1',
        runId: null,
        idempotencyKey: 'ledger:1',
        inputPriceSnapshot: 1,
        outputPriceSnapshot: 2,
        creditsPerDollarSnapshot: 1000,
        profitMultiplierSnapshot: 2,
        costUsd: 0.004,
        createdAt: new Date('2026-03-26T08:00:00.000Z'),
        updatedAt: new Date('2026-03-26T08:00:00.000Z'),
        allocations: [],
      },
    ] as never);
    prismaMock.creditLedgerEntry.count.mockResolvedValue(1);

    const result = await service.listUserLedger('user-1', {
      limit: 20,
      offset: 0,
    });

    expect(prismaMock.creditLedgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('redacts raw settlement errors from user ledger history', async () => {
    prismaMock.creditLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'ledger-2',
        userId: 'user-1',
        eventType: 'AI_CHAT',
        direction: 'NEUTRAL',
        status: 'FAILED',
        anomalyCode: 'SETTLEMENT_FAILED',
        summary: 'Chat completion',
        creditsDelta: 0,
        computedCredits: 12,
        appliedCredits: 0,
        debtDelta: 0,
        promptTokens: 100,
        completionTokens: 40,
        totalTokens: 140,
        modelId: 'membership:openai/gpt-5.4',
        providerId: 'openai',
        detailsJson: null,
        errorMessage: 'duplicate key value violates unique constraint',
        requestId: null,
        chatId: 'chat-2',
        runId: null,
        idempotencyKey: 'ledger:2',
        inputPriceSnapshot: 1,
        outputPriceSnapshot: 2,
        creditsPerDollarSnapshot: 1000,
        profitMultiplierSnapshot: 2,
        costUsd: 0.004,
        createdAt: new Date('2026-03-26T08:00:00.000Z'),
        updatedAt: new Date('2026-03-26T08:00:00.000Z'),
        allocations: [],
      },
    ] as never);
    prismaMock.creditLedgerEntry.count.mockResolvedValue(1);

    const result = await service.listUserLedger('user-1', {
      limit: 20,
      offset: 0,
    });

    expect(result.items[0]?.errorMessage).toBeNull();
  });

  it('redacts internal detailsJson from user ledger history', async () => {
    prismaMock.creditLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'ledger-2b',
        userId: 'user-1',
        eventType: 'ADMIN_GRANT',
        direction: 'CREDIT',
        status: 'APPLIED',
        anomalyCode: null,
        summary: 'Admin grant',
        creditsDelta: 100,
        computedCredits: 100,
        appliedCredits: 100,
        debtDelta: 0,
        modelId: null,
        providerId: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        detailsJson: {
          operatorId: 'admin-1',
          reason: 'manual_admin_grant',
        },
        errorMessage: null,
        requestId: null,
        chatId: null,
        runId: null,
        idempotencyKey: 'ledger:2b',
        inputPriceSnapshot: null,
        outputPriceSnapshot: null,
        creditsPerDollarSnapshot: null,
        profitMultiplierSnapshot: null,
        costUsd: null,
        createdAt: new Date('2026-03-26T08:00:00.000Z'),
        updatedAt: new Date('2026-03-26T08:00:00.000Z'),
        allocations: [],
      },
    ] as never);
    prismaMock.creditLedgerEntry.count.mockResolvedValue(1);

    const result = await service.listUserLedger('user-1', {
      limit: 20,
      offset: 0,
    });

    expect(result.items[0]?.detailsJson).toBeNull();
  });

  it('redacts internal allocation source ids from user ledger history', async () => {
    prismaMock.creditLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'ledger-2c',
        userId: 'user-1',
        eventType: 'PURCHASED_GRANT',
        direction: 'CREDIT',
        status: 'APPLIED',
        anomalyCode: null,
        summary: 'Purchased credits',
        creditsDelta: 100,
        computedCredits: 100,
        appliedCredits: 100,
        debtDelta: 0,
        modelId: null,
        providerId: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        detailsJson: null,
        errorMessage: null,
        requestId: null,
        chatId: null,
        runId: null,
        idempotencyKey: 'ledger:2c',
        inputPriceSnapshot: null,
        outputPriceSnapshot: null,
        creditsPerDollarSnapshot: null,
        profitMultiplierSnapshot: null,
        costUsd: null,
        createdAt: new Date('2026-03-26T08:00:00.000Z'),
        updatedAt: new Date('2026-03-26T08:00:00.000Z'),
        allocations: [
          {
            bucketType: 'PURCHASED',
            amount: 100,
            sourcePurchasedCreditsId: 'purchase-1',
          },
        ],
      },
    ] as never);
    prismaMock.creditLedgerEntry.count.mockResolvedValue(1);

    const result = await service.listUserLedger('user-1', {
      limit: 20,
      offset: 0,
    });

    expect(result.items[0]?.allocations).toEqual([
      {
        bucketType: 'PURCHASED',
        amount: 100,
        sourcePurchasedCreditsId: null,
      },
    ]);
  });

  it('supports anomaly and zero-delta filters for admin ledger queries', async () => {
    prismaMock.creditLedgerEntry.findMany.mockResolvedValue([]);
    prismaMock.creditLedgerEntry.count.mockResolvedValue(0);

    await service.listAdminLedger({
      userId: 'user-1',
      status: 'SKIPPED',
      anomalyCode: 'ZERO_CREDITS_WITH_USAGE',
      zeroDelta: true,
      hasTokens: true,
      limit: 50,
      offset: 0,
    });

    expect(prismaMock.creditLedgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          status: 'SKIPPED',
          anomalyCode: 'ZERO_CREDITS_WITH_USAGE',
          creditsDelta: 0,
          totalTokens: { gt: 0 },
        }),
      }),
    );
  });

  it('keeps raw settlement errors in admin ledger queries', async () => {
    prismaMock.creditLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'ledger-3',
        userId: 'user-1',
        eventType: 'AI_CHAT',
        direction: 'NEUTRAL',
        status: 'FAILED',
        anomalyCode: 'SETTLEMENT_FAILED',
        summary: 'Chat completion',
        creditsDelta: 0,
        computedCredits: 12,
        appliedCredits: 0,
        debtDelta: 0,
        promptTokens: 100,
        completionTokens: 40,
        totalTokens: 140,
        modelId: 'membership:openai/gpt-5.4',
        providerId: 'openai',
        detailsJson: null,
        errorMessage: 'duplicate key value violates unique constraint',
        requestId: null,
        chatId: 'chat-3',
        runId: null,
        idempotencyKey: 'ledger:3',
        inputPriceSnapshot: 1,
        outputPriceSnapshot: 2,
        creditsPerDollarSnapshot: 1000,
        profitMultiplierSnapshot: 2,
        costUsd: 0.004,
        createdAt: new Date('2026-03-26T08:00:00.000Z'),
        updatedAt: new Date('2026-03-26T08:00:00.000Z'),
        allocations: [],
        user: { email: 'user@example.com' },
      },
    ] as never);
    prismaMock.creditLedgerEntry.count.mockResolvedValue(1);

    const result = await service.listAdminLedger({
      limit: 20,
      offset: 0,
    });

    expect(result.items[0]?.errorMessage).toBe(
      'duplicate key value violates unique constraint',
    );
  });

  it('keeps detailsJson in admin ledger queries', async () => {
    prismaMock.creditLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'ledger-4',
        userId: 'user-1',
        eventType: 'ADMIN_GRANT',
        direction: 'CREDIT',
        status: 'APPLIED',
        anomalyCode: null,
        summary: 'Admin grant',
        creditsDelta: 100,
        computedCredits: 100,
        appliedCredits: 100,
        debtDelta: 0,
        modelId: null,
        providerId: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        detailsJson: {
          operatorId: 'admin-1',
          reason: 'manual_admin_grant',
        },
        errorMessage: null,
        requestId: null,
        chatId: null,
        runId: null,
        idempotencyKey: 'ledger:4',
        inputPriceSnapshot: null,
        outputPriceSnapshot: null,
        creditsPerDollarSnapshot: null,
        profitMultiplierSnapshot: null,
        costUsd: null,
        createdAt: new Date('2026-03-26T08:00:00.000Z'),
        updatedAt: new Date('2026-03-26T08:00:00.000Z'),
        allocations: [],
        user: { email: 'user@example.com' },
      },
    ] as never);
    prismaMock.creditLedgerEntry.count.mockResolvedValue(1);

    const result = await service.listAdminLedger({
      limit: 20,
      offset: 0,
    });

    expect(result.items[0]?.detailsJson).toEqual({
      operatorId: 'admin-1',
      reason: 'manual_admin_grant',
    });
  });

  it('keeps allocation source ids in admin ledger queries', async () => {
    prismaMock.creditLedgerEntry.findMany.mockResolvedValue([
      {
        id: 'ledger-5',
        userId: 'user-1',
        eventType: 'PURCHASED_GRANT',
        direction: 'CREDIT',
        status: 'APPLIED',
        anomalyCode: null,
        summary: 'Purchased credits',
        creditsDelta: 100,
        computedCredits: 100,
        appliedCredits: 100,
        debtDelta: 0,
        modelId: null,
        providerId: null,
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
        detailsJson: null,
        errorMessage: null,
        requestId: null,
        chatId: null,
        runId: null,
        idempotencyKey: 'ledger:5',
        inputPriceSnapshot: null,
        outputPriceSnapshot: null,
        creditsPerDollarSnapshot: null,
        profitMultiplierSnapshot: null,
        costUsd: null,
        createdAt: new Date('2026-03-26T08:00:00.000Z'),
        updatedAt: new Date('2026-03-26T08:00:00.000Z'),
        allocations: [
          {
            bucketType: 'PURCHASED',
            amount: 100,
            sourcePurchasedCreditsId: 'purchase-1',
          },
        ],
        user: { email: 'user@example.com' },
      },
    ] as never);
    prismaMock.creditLedgerEntry.count.mockResolvedValue(1);

    const result = await service.listAdminLedger({
      limit: 20,
      offset: 0,
    });

    expect(result.items[0]?.allocations).toEqual([
      {
        bucketType: 'PURCHASED',
        amount: 100,
        sourcePurchasedCreditsId: 'purchase-1',
      },
    ]);
  });
});
