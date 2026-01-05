/**
 * 更新用户资料 DTO
 */

import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z
    .string()
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
