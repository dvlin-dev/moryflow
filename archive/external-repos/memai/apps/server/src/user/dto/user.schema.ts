/**
 * User module Zod schemas
 *
 * [DEFINES]: ChangePasswordSchema, UpdateProfileSchema, DeleteAccountSchema
 * [USED_BY]: user.controller.ts, user.service.ts
 */
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ========== Constants ==========

export const VALID_DELETION_REASONS = [
  'not_useful',
  'found_alternative',
  'too_expensive',
  'too_complex',
  'bugs_issues',
  'other',
] as const;

export type DeletionReasonCode = (typeof VALID_DELETION_REASONS)[number];

// ========== Request Schemas ==========

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters'),
});

export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .max(100, 'Name cannot exceed 100 characters')
    .optional(),
});

export const DeleteAccountSchema = z.object({
  reason: z.enum(VALID_DELETION_REASONS, {
    message: 'Invalid deletion reason',
  }),
  feedback: z
    .string()
    .max(500, 'Feedback cannot exceed 500 characters')
    .optional(),
  confirmation: z.string().min(1, 'Confirmation email is required'),
});

// ========== DTO Classes ==========

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
export class DeleteAccountDto extends createZodDto(DeleteAccountSchema) {}
