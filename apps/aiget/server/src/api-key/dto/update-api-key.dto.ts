import { z } from 'zod';

export const updateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
  isActive: z.boolean().optional(),
});

export type UpdateApiKeyDto = z.infer<typeof updateApiKeySchema>;
