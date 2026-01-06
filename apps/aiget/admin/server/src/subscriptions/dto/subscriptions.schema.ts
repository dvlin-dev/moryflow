/**
 * [DEFINES]: 订阅管理 DTO schemas
 */

import { z } from 'zod';

export const SubscriptionStatusSchema = z.enum(['ACTIVE', 'CANCELED', 'EXPIRED', 'PAST_DUE']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const ListSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: SubscriptionStatusSchema.optional(),
  userId: z.string().optional(),
});
export type ListSubscriptionsQuery = z.infer<typeof ListSubscriptionsQuerySchema>;
