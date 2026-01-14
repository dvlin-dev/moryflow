/**
 * Admin DTOs
 * Zod schemas for admin API validation
 */

import { z } from 'zod';

// =============================================
// Auth
// =============================================

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type AdminLoginDto = z.infer<typeof adminLoginSchema>;

// =============================================
// Pagination
// =============================================

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// =============================================
// Users
// =============================================

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isAdmin: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const userQuerySchema = paginationQuerySchema.extend({
  isAdmin: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    ),
});

export type UserQuery = z.infer<typeof userQuerySchema>;

// =============================================
// Subscriptions
// =============================================

export const subscriptionQuerySchema = paginationQuerySchema.extend({
  tier: z.enum(['FREE', 'BASIC', 'PRO', 'TEAM']).optional(),
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED']).optional(),
});

export type SubscriptionQuery = z.infer<typeof subscriptionQuerySchema>;

export const updateSubscriptionSchema = z.object({
  tier: z.enum(['FREE', 'BASIC', 'PRO', 'TEAM']).optional(),
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'EXPIRED']).optional(),
});

export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;

// =============================================
// Orders
// =============================================

export const orderQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  type: z.enum(['subscription', 'quota_purchase']).optional(),
});

export type OrderQuery = z.infer<typeof orderQuerySchema>;

// =============================================
// Jobs (ScrapeJob)
// =============================================

export const jobsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  errorCode: z
    .enum([
      'PAGE_TIMEOUT',
      'URL_NOT_ALLOWED',
      'SELECTOR_NOT_FOUND',
      'BROWSER_ERROR',
      'NETWORK_ERROR',
      'RATE_LIMITED',
      'QUOTA_EXCEEDED',
      'INVALID_URL',
      'PAGE_NOT_FOUND',
      'ACCESS_DENIED',
    ])
    .optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type JobsQuery = z.infer<typeof jobsQuerySchema>;

export const errorStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export type ErrorStatsQuery = z.infer<typeof errorStatsQuerySchema>;

export const cleanupStaleJobsSchema = z.object({
  maxAgeMinutes: z.coerce.number().int().min(5).max(1440).default(30),
  dryRun: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),
});

export type CleanupStaleJobsQuery = z.infer<typeof cleanupStaleJobsSchema>;

// =============================================
// Queues
// =============================================

export const queueJobsQuerySchema = paginationQuerySchema
  .omit({ search: true })
  .extend({
    status: z
      .enum(['waiting', 'active', 'completed', 'failed', 'delayed'])
      .default('waiting'),
  });

export type QueueJobsQuery = z.infer<typeof queueJobsQuerySchema>;

export const cleanQueueSchema = z.object({
  status: z.enum(['completed', 'failed']).default('completed'),
});

export type CleanQueueDto = z.infer<typeof cleanQueueSchema>;

// =============================================
// Digest Topics
// =============================================

export const digestTopicQuerySchema = paginationQuerySchema.extend({
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) =>
      val === 'true' ? true : val === 'false' ? false : undefined,
    ),
  visibility: z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']).optional(),
  status: z
    .enum(['ACTIVE', 'PAUSED_INSUFFICIENT_CREDITS', 'PAUSED_BY_ADMIN'])
    .optional(),
});

export type DigestTopicQuery = z.infer<typeof digestTopicQuerySchema>;

export const setFeaturedSchema = z.object({
  featured: z.boolean(),
  featuredOrder: z.number().int().min(0).max(999).optional(),
});

export type SetFeaturedDto = z.infer<typeof setFeaturedSchema>;

export const reorderFeaturedSchema = z.object({
  topicIds: z.array(z.string()).min(1).max(50),
});

export type ReorderFeaturedDto = z.infer<typeof reorderFeaturedSchema>;
