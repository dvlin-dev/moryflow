import type { Prisma } from '../../generated/prisma/client';
import type {
  CreditBucketType,
  CreditLedgerAnomalyCode,
  CreditLedgerDirection,
  CreditLedgerEventType,
  CreditLedgerStatus,
} from '../../generated/prisma/enums';

export interface CreditLedgerAllocationInput {
  bucketType: CreditBucketType;
  amount: number;
  sourcePurchasedCreditsId?: string;
}

export interface CreditLedgerWriteResult {
  id: string;
  status: CreditLedgerStatus;
  anomalyCode: CreditLedgerAnomalyCode | null;
  creditsDelta: number;
  computedCredits: number;
  appliedCredits: number;
  debtDelta: number;
}

export interface AiSettlementInput {
  userId: string;
  summary: string;
  idempotencyKey: string;
  eventType: 'AI_CHAT' | 'AI_IMAGE';
  usageMissing?: boolean;
  requestId?: string;
  chatId?: string;
  runId?: string;
  modelId?: string;
  providerId?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  inputPriceSnapshot?: number;
  outputPriceSnapshot?: number;
  creditsPerDollarSnapshot?: number;
  profitMultiplierSnapshot?: number;
  costUsd?: number;
  computedCredits: number;
  detailsJson?: Prisma.JsonObject;
}

export interface GrantPurchasedCreditsInput {
  userId: string;
  amount: number;
  summary: string;
  eventType: 'PURCHASED_GRANT' | 'REDEMPTION_GRANT' | 'ADMIN_GRANT';
  idempotencyKey?: string;
  orderId?: string;
  expiresAt?: Date;
  detailsJson?: Prisma.JsonObject;
  transactionClient?: Prisma.TransactionClient;
}

export interface GrantSubscriptionCreditsInput {
  userId: string;
  amount: number;
  summary: string;
  periodStart: Date;
  periodEnd: Date;
  eventType: 'SUBSCRIPTION_GRANT' | 'REDEMPTION_GRANT' | 'ADMIN_GRANT';
  idempotencyKey?: string;
  detailsJson?: Prisma.JsonObject;
  transactionClient?: Prisma.TransactionClient;
}

export interface RedemptionGrantInput {
  type: 'purchased' | 'subscription';
  userId: string;
  amount: number;
  summary: string;
  idempotencyKey?: string;
  orderId?: string;
  expiresAt?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  detailsJson?: Prisma.JsonObject;
  transactionClient?: Prisma.TransactionClient;
}

export interface AdminGrantInput {
  type: 'purchased' | 'subscription';
  userId: string;
  amount: number;
  summary: string;
  idempotencyKey?: string;
  reason?: string;
  periodStart?: Date;
  periodEnd?: Date;
  detailsJson?: Prisma.JsonObject;
  transactionClient?: Prisma.TransactionClient;
}

export interface CreditLedgerListItem {
  id: string;
  userId: string;
  userEmail?: string;
  eventType: CreditLedgerEventType;
  direction: CreditLedgerDirection;
  status: CreditLedgerStatus;
  anomalyCode: CreditLedgerAnomalyCode | null;
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
  detailsJson: Prisma.JsonValue | null;
  createdAt: string;
  allocations: Array<{
    bucketType: CreditBucketType;
    amount: number;
    sourcePurchasedCreditsId: string | null;
  }>;
}

export interface CreditLedgerListResponse {
  items: CreditLedgerListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface CreditLedgerAdminQuery {
  userId?: string;
  email?: string;
  eventType?: CreditLedgerEventType;
  status?: CreditLedgerStatus;
  anomalyCode?: CreditLedgerAnomalyCode;
  zeroDelta?: boolean;
  hasTokens?: boolean;
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
}

export interface CreditLedgerUserQuery {
  limit: number;
  offset: number;
}
