/**
 * 修改密码 DTO
 */

import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
