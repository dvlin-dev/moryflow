import { z } from 'zod';

export const createRedemptionCodeSchema = z
  .object({
    type: z.enum(['CREDITS', 'MEMBERSHIP']),
    creditsAmount: z.number().int().min(1).max(1_000_000).optional(),
    membershipTier: z.string().min(1).optional(),
    membershipDays: z.number().int().min(1).max(365).optional(),
    maxRedemptions: z.number().int().min(1).max(100_000).optional().default(1),
    code: z.string().trim().toUpperCase().min(3).max(20).optional(),
    expiresAt: z.coerce.date().optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'CREDITS')
        return data.creditsAmount !== undefined && data.creditsAmount > 0;
      if (data.type === 'MEMBERSHIP')
        return !!data.membershipTier && !!data.membershipDays;
      return true;
    },
    {
      message:
        'CREDITS requires creditsAmount; MEMBERSHIP requires membershipTier and membershipDays',
    },
  );

export type CreateRedemptionCodeDto = z.infer<
  typeof createRedemptionCodeSchema
>;

export const updateRedemptionCodeSchema = z.object({
  maxRedemptions: z.number().int().min(1).max(100_000).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

export type UpdateRedemptionCodeDto = z.infer<
  typeof updateRedemptionCodeSchema
>;

export const redemptionCodeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(['CREDITS', 'MEMBERSHIP']).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) =>
      v === 'true' ? true : v === 'false' ? false : undefined,
    ),
});

export type RedemptionCodeQueryDto = z.infer<typeof redemptionCodeQuerySchema>;

export const redeemCodeSchema = z.object({
  code: z.string().trim().min(1).max(20),
});
