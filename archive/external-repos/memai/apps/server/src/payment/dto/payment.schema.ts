/**
 * Payment module Zod schemas
 *
 * [DEFINES]: CreemWebhookSchema, SubscriptionActivatedParams, QuotaPurchaseParams
 * [USED_BY]: payment.controller.ts, payment-webhook.controller.ts, payment.service.ts
 */
import { z } from 'zod';
import type { SubscriptionTier } from '../../../generated/prisma/client';

// ========== Webhook Schemas ==========

/**
 * Creem Webhook payload schema
 * Based on Creem docs: https://docs.creem.io/code/webhooks
 */
export const CreemWebhookSchema = z.object({
  id: z.string().min(1),
  eventType: z.string().min(1),
  created_at: z.number(),
  object: z.object({
    id: z.string().min(1),
    product: z
      .object({ id: z.string().min(1) })
      .passthrough()
      .optional(),
    customer: z
      .object({
        id: z.string().min(1),
        email: z.string().optional(),
      })
      .passthrough()
      .optional(),
    // checkout.completed event has subscription as nested object
    subscription: z
      .union([z.string(), z.object({ id: z.string().min(1) }).passthrough()])
      .optional(),
    order: z
      .object({
        id: z.string().min(1),
        amount: z.number().int().nonnegative(),
        currency: z.string().min(1),
      })
      .passthrough()
      .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    current_period_start_date: z.string().optional(),
    current_period_end_date: z.string().optional(),
  }),
});

// ========== Inferred Types ==========

export type CreemWebhookPayload = z.infer<typeof CreemWebhookSchema>;

// ========== Internal Service Types ==========

/** Subscription activation params (internal use) */
export interface SubscriptionActivatedParams {
  userId: string;
  creemCustomerId: string;
  creemSubscriptionId: string;
  tier: SubscriptionTier;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

/** Quota purchase params (internal use) */
export interface QuotaPurchaseParams {
  userId: string;
  /** Quota amount purchased */
  amount: number;
  creemOrderId: string;
  /** Price in cents */
  price: number;
}
