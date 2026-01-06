import { z } from 'zod';

export const CreditTypeSchema = z.enum(['SUBSCRIPTION', 'PURCHASED', 'BONUS', 'CONSUMPTION']);

export const ListCreditsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: CreditTypeSchema.optional(),
  userId: z.string().optional(),
});
export type ListCreditsQuery = z.infer<typeof ListCreditsQuerySchema>;
