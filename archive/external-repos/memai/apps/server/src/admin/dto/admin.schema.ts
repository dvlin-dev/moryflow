/**
 * Admin module Zod schemas
 *
 * [DEFINES]: PaginationQuerySchema, UserQuerySchema, SubscriptionQuerySchema, etc.
 * [USED_BY]: admin-*.controller.ts
 */
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ========== Pagination ==========

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
});

// ========== Auth ==========

export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

// ========== Users ==========

export const UserQuerySchema = PaginationQuerySchema.extend({
  isAdmin: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isAdmin: z.boolean().optional(),
});

// ========== Subscriptions ==========

export const SubscriptionQuerySchema = PaginationQuerySchema.extend({
  tier: z.enum(['FREE', 'HOBBY', 'ENTERPRISE']).optional(),
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED']).optional(),
});

export const UpdateSubscriptionSchema = z.object({
  tier: z.enum(['FREE', 'HOBBY', 'ENTERPRISE']).optional(),
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED']).optional(),
});

// ========== Orders ==========

export const OrderQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  type: z.enum(['subscription', 'usage_billing']).optional(),
});

// ========== Inferred Types ==========

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type SubscriptionQuery = z.infer<typeof SubscriptionQuerySchema>;
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionSchema>;
export type OrderQuery = z.infer<typeof OrderQuerySchema>;

// ========== DTO Classes ==========

export class PaginationQueryDto extends createZodDto(PaginationQuerySchema) {}
export class AdminLoginDto extends createZodDto(AdminLoginSchema) {}
export class UserQueryDto extends createZodDto(UserQuerySchema) {}
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
export class SubscriptionQueryDto extends createZodDto(SubscriptionQuerySchema) {}
export class UpdateSubscriptionDto extends createZodDto(UpdateSubscriptionSchema) {}
export class OrderQueryDto extends createZodDto(OrderQuerySchema) {}
