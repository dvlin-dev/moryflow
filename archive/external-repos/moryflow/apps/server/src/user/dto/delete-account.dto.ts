/**
 * 删除账户 DTO
 */

import { z } from 'zod';

// 有效的删除原因代码
export const VALID_DELETION_REASONS = [
  'not_useful',
  'found_alternative',
  'too_expensive',
  'too_complex',
  'bugs_issues',
  'other',
] as const;

export type DeletionReasonCode = (typeof VALID_DELETION_REASONS)[number];

// Zod Schema
export const deleteAccountSchema = z.object({
  reason: z.enum(VALID_DELETION_REASONS, {
    message: 'Invalid deletion reason',
  }),
  feedback: z
    .string()
    .max(500, 'Feedback cannot exceed 500 characters')
    .optional(),
  confirmation: z.string().min(1, 'Confirmation email is required'),
});

export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;
