import { BadRequestException, Injectable } from '@nestjs/common';
import { DAILY_FREE_CREDITS, PURCHASED_CREDITS_EXPIRY_DAYS } from '../config';
import { PrismaService } from '../prisma';
import type { Prisma } from '../../generated/prisma/client';
import {
  CreditBucketType,
  CreditLedgerDirection,
  CreditLedgerEventType,
  CreditLedgerStatus,
  CreditLedgerAnomalyCode,
} from '../../generated/prisma/enums';
import type {
  AdminGrantInput,
  AiSettlementInput,
  CreditLedgerAllocationInput,
  CreditLedgerWriteResult,
  GrantPurchasedCreditsInput,
  GrantSubscriptionCreditsInput,
  RedemptionGrantInput,
} from './credit-ledger.types';

type UsageProjectionDelta = {
  creditsUsedDaily: number;
  creditsUsedSubscription: number;
  creditsUsedPurchased: number;
  requestCount: number;
  tokenUsed: number;
};

@Injectable()
export class CreditLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAiChatSettlement(
    input: Omit<AiSettlementInput, 'eventType'>,
  ): Promise<CreditLedgerWriteResult> {
    return this.recordAiSettlement({ ...input, eventType: 'AI_CHAT' });
  }

  async recordAiImageSettlement(
    input: Omit<AiSettlementInput, 'eventType'>,
  ): Promise<CreditLedgerWriteResult> {
    return this.recordAiSettlement({ ...input, eventType: 'AI_IMAGE' });
  }

  async recordAiSettlementFailure(
    input: AiSettlementInput & {
      errorMessage: string;
      anomalyCode?: CreditLedgerAnomalyCode;
    },
  ): Promise<CreditLedgerWriteResult> {
    const anomalyCode =
      input.anomalyCode ?? CreditLedgerAnomalyCode.SETTLEMENT_FAILED;
    const entry = await this.prisma.creditLedgerEntry.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        direction: CreditLedgerDirection.NEUTRAL,
        status: CreditLedgerStatus.FAILED,
        anomalyCode,
        creditsDelta: 0,
        computedCredits: input.computedCredits,
        appliedCredits: 0,
        debtDelta: 0,
        summary: input.summary,
        detailsJson: input.detailsJson,
        errorMessage: input.errorMessage,
        requestId: input.requestId,
        chatId: input.chatId,
        runId: input.runId,
        idempotencyKey: input.idempotencyKey,
        modelId: input.modelId,
        providerId: input.providerId,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.totalTokens,
        inputPriceSnapshot: input.inputPriceSnapshot,
        outputPriceSnapshot: input.outputPriceSnapshot,
        creditsPerDollarSnapshot: input.creditsPerDollarSnapshot,
        profitMultiplierSnapshot: input.profitMultiplierSnapshot,
        costUsd: input.costUsd,
      },
    });

    return this.toWriteResult(entry);
  }

  async grantPurchasedCredits(
    input: GrantPurchasedCreditsInput,
  ): Promise<CreditLedgerWriteResult> {
    this.ensurePositiveAmount(input.amount);

    return this.executeInTransaction(input.transactionClient, async (tx) => {
      await this.lockUserLedgerWrite(tx, input.userId);
      const debtPaid = await this.applyDebtPayment(
        tx,
        input.userId,
        input.amount,
      );
      const remaining = input.amount - debtPaid;
      const expiry =
        input.expiresAt ??
        new Date(
          Date.now() + PURCHASED_CREDITS_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        );

      if (remaining > 0) {
        await tx.purchasedCredits.create({
          data: {
            userId: input.userId,
            amount: input.amount,
            remaining,
            orderId: input.orderId,
            expiresAt: expiry,
          },
        });
      }

      const entry = await tx.creditLedgerEntry.create({
        data: {
          userId: input.userId,
          eventType: input.eventType,
          direction: CreditLedgerDirection.CREDIT,
          status: CreditLedgerStatus.APPLIED,
          creditsDelta: remaining,
          computedCredits: input.amount,
          appliedCredits: remaining,
          debtDelta: debtPaid > 0 ? -debtPaid : 0,
          summary: input.summary,
          detailsJson: input.detailsJson,
          idempotencyKey: input.idempotencyKey,
        },
      });

      const allocations: CreditLedgerAllocationInput[] = [];
      if (debtPaid > 0) {
        allocations.push({
          bucketType: CreditBucketType.DEBT,
          amount: -debtPaid,
        });
      }
      if (remaining > 0) {
        allocations.push({
          bucketType: CreditBucketType.PURCHASED,
          amount: remaining,
        });
      }

      await this.createAllocations(tx, entry.id, allocations);
      return this.toWriteResult(entry);
    });
  }

  async grantSubscriptionCredits(
    input: GrantSubscriptionCreditsInput,
  ): Promise<CreditLedgerWriteResult> {
    this.ensurePositiveAmount(input.amount);

    return this.executeInTransaction(input.transactionClient, async (tx) => {
      await this.lockUserLedgerWrite(tx, input.userId);
      const debtPaid = await this.applyDebtPayment(
        tx,
        input.userId,
        input.amount,
      );
      const remaining = input.amount - debtPaid;

      await tx.subscriptionCredits.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          creditsTotal: input.amount,
          creditsRemaining: remaining,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
        update: {
          creditsTotal: input.amount,
          creditsRemaining: remaining,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      });

      const entry = await tx.creditLedgerEntry.create({
        data: {
          userId: input.userId,
          eventType: input.eventType,
          direction: CreditLedgerDirection.CREDIT,
          status: CreditLedgerStatus.APPLIED,
          creditsDelta: remaining,
          computedCredits: input.amount,
          appliedCredits: remaining,
          debtDelta: debtPaid > 0 ? -debtPaid : 0,
          summary: input.summary,
          detailsJson: input.detailsJson,
          idempotencyKey: input.idempotencyKey,
        },
      });

      const allocations: CreditLedgerAllocationInput[] = [];
      if (debtPaid > 0) {
        allocations.push({
          bucketType: CreditBucketType.DEBT,
          amount: -debtPaid,
        });
      }
      if (remaining > 0) {
        allocations.push({
          bucketType: CreditBucketType.SUBSCRIPTION,
          amount: remaining,
        });
      }

      await this.createAllocations(tx, entry.id, allocations);
      return this.toWriteResult(entry);
    });
  }

  async grantRedemptionCredits(
    input: RedemptionGrantInput,
  ): Promise<CreditLedgerWriteResult> {
    if (input.type === 'subscription') {
      if (!input.periodStart || !input.periodEnd) {
        throw new BadRequestException('periodStart and periodEnd are required');
      }
      return this.grantSubscriptionCredits({
        userId: input.userId,
        amount: input.amount,
        summary: input.summary,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        eventType: CreditLedgerEventType.REDEMPTION_GRANT,
        idempotencyKey: input.idempotencyKey,
        detailsJson: input.detailsJson,
        transactionClient: input.transactionClient,
      });
    }

    return this.grantPurchasedCredits({
      userId: input.userId,
      amount: input.amount,
      summary: input.summary,
      eventType: CreditLedgerEventType.REDEMPTION_GRANT,
      idempotencyKey: input.idempotencyKey,
      orderId: input.orderId,
      expiresAt: input.expiresAt,
      detailsJson: input.detailsJson,
      transactionClient: input.transactionClient,
    });
  }

  async grantAdminCredits(
    input: AdminGrantInput,
  ): Promise<CreditLedgerWriteResult> {
    const detailsJson = {
      ...(input.detailsJson ?? {}),
      ...(input.reason ? { reason: input.reason } : {}),
    } as Prisma.JsonObject;

    if (input.type === 'subscription') {
      if (!input.periodStart || !input.periodEnd) {
        throw new BadRequestException('periodStart and periodEnd are required');
      }
      return this.grantSubscriptionCredits({
        userId: input.userId,
        amount: input.amount,
        summary: input.summary,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        eventType: CreditLedgerEventType.ADMIN_GRANT,
        idempotencyKey: input.idempotencyKey,
        detailsJson,
        transactionClient: input.transactionClient,
      });
    }

    return this.grantPurchasedCredits({
      userId: input.userId,
      amount: input.amount,
      summary: input.summary,
      eventType: CreditLedgerEventType.ADMIN_GRANT,
      idempotencyKey: input.idempotencyKey,
      detailsJson,
      transactionClient: input.transactionClient,
    });
  }

  private async recordAiSettlement(
    input: AiSettlementInput,
  ): Promise<CreditLedgerWriteResult> {
    const anomalyCode = this.resolveAiAnomalyCode(input);
    const status =
      input.computedCredits > 0
        ? CreditLedgerStatus.APPLIED
        : CreditLedgerStatus.SKIPPED;

    return this.prisma.$transaction(async (tx) => {
      await this.lockUserLedgerWrite(tx, input.userId);
      let appliedCredits = 0;
      let debtDelta = 0;
      let allocations: CreditLedgerAllocationInput[] = [];
      let usageDelta: UsageProjectionDelta | null = null;

      if (input.totalTokens && input.totalTokens > 0) {
        usageDelta = {
          creditsUsedDaily: 0,
          creditsUsedSubscription: 0,
          creditsUsedPurchased: 0,
          requestCount: 1,
          tokenUsed: input.totalTokens,
        };
      }

      if (input.computedCredits > 0) {
        const debit = await this.applyAiDebitInTx(
          tx,
          input.userId,
          input.computedCredits,
          input.totalTokens ?? 0,
        );
        appliedCredits = debit.appliedCredits;
        debtDelta = debit.debtDelta;
        allocations = debit.allocations;
        usageDelta = debit.usageDelta;
      } else if (usageDelta) {
        await this.upsertUsageDaily(tx, input.userId, usageDelta);
      }

      const entry = await tx.creditLedgerEntry.create({
        data: {
          userId: input.userId,
          eventType: input.eventType,
          direction:
            input.computedCredits > 0
              ? CreditLedgerDirection.DEBIT
              : CreditLedgerDirection.NEUTRAL,
          status,
          anomalyCode,
          creditsDelta: -appliedCredits,
          computedCredits: input.computedCredits,
          appliedCredits,
          debtDelta,
          summary: input.summary,
          detailsJson: input.detailsJson,
          requestId: input.requestId,
          chatId: input.chatId,
          runId: input.runId,
          idempotencyKey: input.idempotencyKey,
          modelId: input.modelId,
          providerId: input.providerId,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          totalTokens: input.totalTokens,
          inputPriceSnapshot: input.inputPriceSnapshot,
          outputPriceSnapshot: input.outputPriceSnapshot,
          creditsPerDollarSnapshot: input.creditsPerDollarSnapshot,
          profitMultiplierSnapshot: input.profitMultiplierSnapshot,
          costUsd: input.costUsd,
        },
      });

      await this.createAllocations(tx, entry.id, allocations);
      return this.toWriteResult(entry);
    });
  }

  private resolveAiAnomalyCode(
    input: AiSettlementInput,
  ): CreditLedgerAnomalyCode | null {
    if (
      input.eventType === CreditLedgerEventType.AI_IMAGE &&
      input.computedCredits > 0
    ) {
      return null;
    }
    if (input.usageMissing) {
      return CreditLedgerAnomalyCode.USAGE_MISSING;
    }
    if ((input.totalTokens ?? 0) <= 0) {
      return CreditLedgerAnomalyCode.ZERO_USAGE;
    }
    if (
      input.computedCredits <= 0 &&
      (input.inputPriceSnapshot ?? 0) <= 0 &&
      (input.outputPriceSnapshot ?? 0) <= 0
    ) {
      return CreditLedgerAnomalyCode.ZERO_PRICE_CONFIG;
    }
    if (input.computedCredits <= 0) {
      return CreditLedgerAnomalyCode.ZERO_CREDITS_WITH_USAGE;
    }
    return null;
  }

  private async lockUserLedgerWrite(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    // Serialize all credit projection writes per user to prevent concurrent overdrafts.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  }

  private async applyAiDebitInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    totalTokens: number,
  ): Promise<{
    appliedCredits: number;
    debtDelta: number;
    allocations: CreditLedgerAllocationInput[];
    usageDelta: UsageProjectionDelta;
  }> {
    const date = this.getTodayDateUTC();
    const usageRecord = await tx.creditUsageDaily.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    let remaining = amount;
    const allocations: CreditLedgerAllocationInput[] = [];
    let creditsUsedDaily = 0;
    let creditsUsedSubscription = 0;
    let creditsUsedPurchased = 0;

    const dailyAvailable = Math.max(
      0,
      DAILY_FREE_CREDITS - (usageRecord?.creditsUsedDaily ?? 0),
    );
    if (dailyAvailable > 0 && remaining > 0) {
      creditsUsedDaily = Math.min(dailyAvailable, remaining);
      remaining -= creditsUsedDaily;
      allocations.push({
        bucketType: CreditBucketType.DAILY,
        amount: -creditsUsedDaily,
      });
    }

    if (remaining > 0) {
      const subscriptionCredits = await tx.subscriptionCredits.findUnique({
        where: { userId },
      });

      if (subscriptionCredits) {
        const now = new Date();
        const isValid =
          now >= subscriptionCredits.periodStart &&
          now <= subscriptionCredits.periodEnd;

        if (isValid && subscriptionCredits.creditsRemaining > 0) {
          creditsUsedSubscription = Math.min(
            subscriptionCredits.creditsRemaining,
            remaining,
          );
          remaining -= creditsUsedSubscription;
          if (creditsUsedSubscription > 0) {
            await tx.subscriptionCredits.update({
              where: { userId },
              data: {
                creditsRemaining: { decrement: creditsUsedSubscription },
              },
            });
            allocations.push({
              bucketType: CreditBucketType.SUBSCRIPTION,
              amount: -creditsUsedSubscription,
            });
          }
        }
      }
    }

    if (remaining > 0) {
      const purchasedCredits = await tx.purchasedCredits.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
          remaining: { gt: 0 },
        },
        orderBy: [{ expiresAt: 'asc' }, { purchasedAt: 'asc' }],
      });

      for (const record of purchasedCredits) {
        if (remaining <= 0) {
          break;
        }
        const toConsume = Math.min(record.remaining, remaining);
        remaining -= toConsume;
        creditsUsedPurchased += toConsume;
        await tx.purchasedCredits.update({
          where: { id: record.id },
          data: {
            remaining: { decrement: toConsume },
          },
        });
        allocations.push({
          bucketType: CreditBucketType.PURCHASED,
          amount: -toConsume,
          sourcePurchasedCreditsId: record.id,
        });
      }
    }

    let debtDelta = 0;
    if (remaining > 0) {
      debtDelta = remaining;
      await tx.creditDebt.upsert({
        where: { userId },
        create: {
          userId,
          amount: remaining,
        },
        update: {
          amount: { increment: remaining },
        },
      });
      allocations.push({
        bucketType: CreditBucketType.DEBT,
        amount: remaining,
      });
    }

    await this.upsertUsageDaily(tx, userId, {
      creditsUsedDaily,
      creditsUsedSubscription,
      creditsUsedPurchased,
      requestCount: 1,
      tokenUsed: totalTokens,
    });

    const appliedCredits = amount - debtDelta;
    return {
      appliedCredits,
      debtDelta,
      allocations,
      usageDelta: {
        creditsUsedDaily,
        creditsUsedSubscription,
        creditsUsedPurchased,
        requestCount: 1,
        tokenUsed: totalTokens,
      },
    };
  }

  private async upsertUsageDaily(
    tx: Prisma.TransactionClient,
    userId: string,
    delta: UsageProjectionDelta,
  ): Promise<void> {
    const date = this.getTodayDateUTC();
    await tx.creditUsageDaily.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      create: {
        userId,
        date,
        creditsUsedDaily: delta.creditsUsedDaily,
        creditsUsedSubscription: delta.creditsUsedSubscription,
        creditsUsedPurchased: delta.creditsUsedPurchased,
        requestCount: delta.requestCount,
        tokenUsed: delta.tokenUsed,
      },
      update: {
        creditsUsedDaily: { increment: delta.creditsUsedDaily },
        creditsUsedSubscription: { increment: delta.creditsUsedSubscription },
        creditsUsedPurchased: { increment: delta.creditsUsedPurchased },
        requestCount: { increment: delta.requestCount },
        tokenUsed: { increment: delta.tokenUsed },
      },
    });
  }

  private async applyDebtPayment(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
  ): Promise<number> {
    if (amount <= 0) {
      return 0;
    }

    const debt = await tx.creditDebt.findUnique({
      where: { userId },
    });
    if (!debt || debt.amount <= 0) {
      return 0;
    }

    const paid = Math.min(debt.amount, amount);
    await tx.creditDebt.update({
      where: { userId },
      data: {
        amount: { decrement: paid },
      },
    });
    return paid;
  }

  private async createAllocations(
    tx: Prisma.TransactionClient,
    entryId: string,
    allocations: CreditLedgerAllocationInput[],
  ): Promise<void> {
    if (allocations.length === 0) {
      return;
    }
    await tx.creditLedgerAllocation.createMany({
      data: allocations.map((allocation) => ({
        entryId,
        bucketType: allocation.bucketType,
        amount: allocation.amount,
        sourcePurchasedCreditsId: allocation.sourcePurchasedCreditsId,
      })),
    });
  }

  private async executeInTransaction<T>(
    tx: Prisma.TransactionClient | undefined,
    callback: (transactionClient: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (tx) {
      return callback(tx);
    }

    return this.prisma.$transaction((transactionClient) =>
      callback(transactionClient),
    );
  }

  private ensurePositiveAmount(amount: number): void {
    if (amount <= 0) {
      throw new BadRequestException('amount must be positive');
    }
  }

  private getTodayDateUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toWriteResult(
    entry: Pick<
      Prisma.CreditLedgerEntryGetPayload<object>,
      | 'id'
      | 'status'
      | 'anomalyCode'
      | 'creditsDelta'
      | 'computedCredits'
      | 'appliedCredits'
      | 'debtDelta'
    >,
  ): CreditLedgerWriteResult {
    return {
      id: entry.id,
      status: entry.status,
      anomalyCode: entry.anomalyCode,
      creditsDelta: entry.creditsDelta,
      computedCredits: entry.computedCredits,
      appliedCredits: entry.appliedCredits,
      debtDelta: entry.debtDelta,
    };
  }
}
