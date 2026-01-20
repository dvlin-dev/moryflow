import { z } from 'zod';

export const updateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
  isActive: z.boolean().optional(),
  llmEnabled: z.boolean().optional(),
  llmProviderId: z.string().min(1).max(50).optional(),
  llmModelId: z.string().min(1).max(200).optional(),
});

export type UpdateApiKeyDto = z.infer<typeof updateApiKeySchema>;
