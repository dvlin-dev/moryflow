import { z } from 'zod';
import {
  CREDIT_LEDGER_DEFAULT_PAGE_SIZE,
  CREDIT_LEDGER_MAX_PAGE_SIZE,
} from '../credit-ledger.constants';

const CreditLedgerEventTypeSchema = z.enum([
  'AI_CHAT',
  'AI_IMAGE',
  'SUBSCRIPTION_GRANT',
  'PURCHASED_GRANT',
  'REDEMPTION_GRANT',
  'ADMIN_GRANT',
]);

const CreditLedgerStatusSchema = z.enum(['APPLIED', 'SKIPPED', 'FAILED']);

const CreditLedgerAnomalyCodeSchema = z.enum([
  'ZERO_USAGE',
  'USAGE_MISSING',
  'ZERO_PRICE_CONFIG',
  'ZERO_CREDITS_WITH_USAGE',
  'SETTLEMENT_FAILED',
]);

const BooleanQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const PaginationSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CREDIT_LEDGER_MAX_PAGE_SIZE)
    .default(CREDIT_LEDGER_DEFAULT_PAGE_SIZE),
  offset: z.coerce.number().int().min(0).default(0),
});

export const CreditLedgerUserQuerySchema = PaginationSchema;

export const CreditLedgerAdminQuerySchema = PaginationSchema.extend({
  userId: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  eventType: CreditLedgerEventTypeSchema.optional(),
  status: CreditLedgerStatusSchema.optional(),
  anomalyCode: CreditLedgerAnomalyCodeSchema.optional(),
  zeroDelta: BooleanQuerySchema.optional(),
  hasTokens: BooleanQuerySchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreditLedgerUserQueryDto = z.infer<
  typeof CreditLedgerUserQuerySchema
>;

export type CreditLedgerAdminQueryDto = z.infer<
  typeof CreditLedgerAdminQuerySchema
>;
