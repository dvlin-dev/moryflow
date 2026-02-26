/**
 * Quota DTOs
 *
 * [DEFINES]: Usage and quota check schemas
 * [USED_BY]: QuotaController, QuotaService
 */

import { z } from 'zod';

// ==================== Response Schemas ====================

/**
 * 存储用量信息
 */
export const StorageUsageSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  percentage: z.number(),
});

export type StorageUsageDto = z.infer<typeof StorageUsageSchema>;

/**
 * 向量化用量信息
 */
export const VectorizedUsageSchema = z.object({
  count: z.number().int(),
  limit: z.number().int(),
  percentage: z.number(),
});

export type VectorizedUsageDto = z.infer<typeof VectorizedUsageSchema>;

/**
 * 单文件限制信息
 */
export const FileSizeLimitSchema = z.object({
  maxFileSize: z.number().int(),
});

export type FileSizeLimitDto = z.infer<typeof FileSizeLimitSchema>;

/**
 * 用户等级 Schema（运行时验证）
 * 与 types/tier.types.ts 保持同步
 */
export const SubscriptionTierSchema = z.enum([
  'free',
  'starter',
  'basic',
  'pro',
]);

/**
 * 完整用量响应
 */
export const UsageResponseSchema = z.object({
  storage: StorageUsageSchema,
  vectorized: VectorizedUsageSchema,
  fileLimit: FileSizeLimitSchema,
  plan: SubscriptionTierSchema,
});

export type UsageResponseDto = z.infer<typeof UsageResponseSchema>;

/**
 * 额度检查结果
 */
export const QuotaCheckResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  currentUsage: z.number().optional(),
  limit: z.number().optional(),
});

export type QuotaCheckResult = z.infer<typeof QuotaCheckResultSchema>;
