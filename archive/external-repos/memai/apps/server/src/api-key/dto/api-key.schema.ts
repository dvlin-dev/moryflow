/**
 * API Key module Zod schemas
 *
 * [DEFINES]: CreateApiKeySchema, UpdateApiKeySchema, ApiKeyValidationResult
 * [USED_BY]: api-key.controller.ts, api-key.service.ts, api-key.guard.ts
 */
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import type { SubscriptionTier } from '../../subscription/subscription.constants';

// ========== Request Schemas ==========

export const CreateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters'),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const UpdateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
  isActive: z.boolean().optional(),
});

// ========== Response Schemas ==========

export const ApiKeyListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  isActive: z.boolean(),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

export const ApiKeyCreateResultSchema = z.object({
  key: z.string(),
  id: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
});

// ========== Inferred Types ==========

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof UpdateApiKeySchema>;
export type ApiKeyListItem = z.infer<typeof ApiKeyListItemSchema>;
export type ApiKeyCreateResult = z.infer<typeof ApiKeyCreateResultSchema>;

// ========== Internal Types ==========

/** API Key validation result (used by guard and service) */
export interface ApiKeyValidationResult {
  id: string;
  userId: string;
  name: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    tier: SubscriptionTier;
    isAdmin: boolean;
  };
}

// ========== DTO Classes ==========

export class CreateApiKeyDto extends createZodDto(CreateApiKeySchema) {}
export class UpdateApiKeyDto extends createZodDto(UpdateApiKeySchema) {}
