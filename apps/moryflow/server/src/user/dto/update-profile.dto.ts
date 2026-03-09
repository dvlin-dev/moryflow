import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .max(80, 'Display name must be at most 80 characters')
      .optional(),
    avatarUrl: z.never().optional(),
  })
  .refine((value) => value.displayName !== undefined, {
    message: 'At least one profile field is required',
  });

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
