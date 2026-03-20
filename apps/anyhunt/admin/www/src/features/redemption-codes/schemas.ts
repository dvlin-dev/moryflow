import { z } from 'zod/v3';

export const createRedemptionCodeSchema = z
  .object({
    type: z.enum(['CREDITS', 'MEMBERSHIP']),
    creditsAmount: z.coerce.number().int().min(1).max(1_000_000).optional(),
    membershipTier: z.string().min(1).optional(),
    membershipDays: z.coerce.number().int().min(1).max(365).optional(),
    maxRedemptions: z.coerce.number().int().min(1).max(100_000).optional().default(1),
    code: z.string().trim().toUpperCase().min(3).max(20).optional().or(z.literal('')),
    expiresAt: z.string().optional().or(z.literal('')),
    note: z.string().max(500).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.type === 'CREDITS')
        return data.creditsAmount !== undefined && data.creditsAmount > 0;
      if (data.type === 'MEMBERSHIP') return !!data.membershipTier && !!data.membershipDays;
      return true;
    },
    { message: 'CREDITS requires creditsAmount; MEMBERSHIP requires membershipTier' }
  );

export type CreateRedemptionCodeFormValues = z.infer<typeof createRedemptionCodeSchema>;

export const updateRedemptionCodeSchema = z.object({
  maxRedemptions: z.coerce.number().int().min(1).max(100_000).optional(),
  expiresAt: z.string().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  note: z.string().max(500).optional().or(z.literal('')),
});

export type UpdateRedemptionCodeFormValues = z.infer<typeof updateRedemptionCodeSchema>;
