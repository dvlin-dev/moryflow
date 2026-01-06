import { z } from 'zod';

export const OrderStatusSchema = z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']);
export const OrderTypeSchema = z.enum(['SUBSCRIPTION', 'CREDIT_BOOST']);

export const ListOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: OrderStatusSchema.optional(),
  type: OrderTypeSchema.optional(),
  userId: z.string().optional(),
});
export type ListOrdersQuery = z.infer<typeof ListOrdersQuerySchema>;
