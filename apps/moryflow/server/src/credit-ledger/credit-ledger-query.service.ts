import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import type {
  CreditLedgerAdminQuery,
  CreditLedgerListItem,
  CreditLedgerListResponse,
  CreditLedgerUserQuery,
} from './credit-ledger.types';

@Injectable()
export class CreditLedgerQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listUserLedger(
    userId: string,
    query: CreditLedgerUserQuery,
  ): Promise<CreditLedgerListResponse> {
    const where = { userId };
    const [entries, total] = await Promise.all([
      this.prisma.creditLedgerEntry.findMany({
        where,
        include: { allocations: true },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.creditLedgerEntry.count({ where }),
    ]);

    return {
      items: entries.map((entry) =>
        this.toItem(entry, {
          exposeErrorMessage: false,
          exposeDetailsJson: false,
        }),
      ),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  async listAdminLedger(
    query: CreditLedgerAdminQuery,
  ): Promise<CreditLedgerListResponse> {
    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.email
        ? {
            user: {
              email: {
                contains: query.email,
                mode: 'insensitive' as const,
              },
            },
          }
        : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.anomalyCode ? { anomalyCode: query.anomalyCode } : {}),
      ...(query.zeroDelta === true ? { creditsDelta: 0 } : {}),
      ...(query.hasTokens === true ? { totalTokens: { gt: 0 } } : {}),
      ...this.buildCreatedAtFilter(query.startDate, query.endDate),
    };

    const [entries, total] = await Promise.all([
      this.prisma.creditLedgerEntry.findMany({
        where,
        include: {
          allocations: true,
          user: {
            select: { email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.creditLedgerEntry.count({ where }),
    ]);

    return {
      items: entries.map((entry) =>
        this.toItem(entry, {
          userEmail: entry.user.email,
          exposeErrorMessage: true,
          exposeDetailsJson: true,
        }),
      ),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  private buildCreatedAtFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) {
      return {};
    }

    return {
      createdAt: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      },
    };
  }

  private toItem(
    entry: {
      id: string;
      userId: string;
      eventType: any;
      direction: any;
      status: any;
      anomalyCode: any;
      summary: string;
      creditsDelta: number;
      computedCredits: number;
      appliedCredits: number;
      debtDelta: number;
      modelId: string | null;
      providerId: string | null;
      promptTokens: number | null;
      completionTokens: number | null;
      totalTokens: number | null;
      errorMessage: string | null;
      detailsJson: any;
      createdAt: Date;
      allocations: Array<{
        bucketType: any;
        amount: number;
        sourcePurchasedCreditsId: string | null;
      }>;
    },
    extra?: {
      userEmail?: string;
      exposeErrorMessage?: boolean;
      exposeDetailsJson?: boolean;
    },
  ): CreditLedgerListItem {
    return {
      id: entry.id,
      userId: entry.userId,
      ...(extra?.userEmail ? { userEmail: extra.userEmail } : {}),
      eventType: entry.eventType,
      direction: entry.direction,
      status: entry.status,
      anomalyCode: entry.anomalyCode,
      summary: entry.summary,
      creditsDelta: entry.creditsDelta,
      computedCredits: entry.computedCredits,
      appliedCredits: entry.appliedCredits,
      debtDelta: entry.debtDelta,
      modelId: entry.modelId,
      providerId: entry.providerId,
      promptTokens: entry.promptTokens,
      completionTokens: entry.completionTokens,
      totalTokens: entry.totalTokens,
      errorMessage: extra?.exposeErrorMessage ? entry.errorMessage : null,
      detailsJson: extra?.exposeDetailsJson ? entry.detailsJson : null,
      createdAt: entry.createdAt.toISOString(),
      allocations: entry.allocations.map((allocation) => ({
        bucketType: allocation.bucketType,
        amount: allocation.amount,
        sourcePurchasedCreditsId: allocation.sourcePurchasedCreditsId,
      })),
    };
  }
}
