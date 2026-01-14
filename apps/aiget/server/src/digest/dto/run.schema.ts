/**
 * Digest Run DTO - Zod Schemas
 *
 * [INPUT]: 运行记录查询请求参数
 * [OUTPUT]: 验证后的查询条件和响应
 * [POS]: Zod schemas + 推断类型
 */

import { z } from 'zod';

// ========== 枚举 Schema ==========

export const DigestRunStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
]);

export const DigestRunSourceSchema = z.enum(['SCHEDULED', 'MANUAL']);

// ========== Run 列表查询 Schema ==========

export const ListRunsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: DigestRunStatusSchema.optional(),
});

// ========== Admin 列表查询 Schema（page/limit） ==========

export const AdminListRunsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: DigestRunStatusSchema.optional(),
  subscriptionId: z.string().optional(),
});

// ========== 手动触发 Run Schema ==========

export const TriggerRunSchema = z.object({
  // 可选覆盖参数
  outputLocale: z.string().max(10).optional(),
});

// ========== Run 响应 Schema ==========

export const RunResponseSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  subscriptionName: z.string(),

  status: DigestRunStatusSchema,
  source: DigestRunSourceSchema,

  scheduledAt: z.date(),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),

  outputLocale: z.string(),
  narrativeMarkdown: z.string().nullable(),

  // 计费
  billing: z.object({
    model: z.string(),
    totalCredits: z.number(),
    charged: z.boolean(),
    breakdown: z.record(
      z.string(),
      z.object({
        count: z.number(),
        costPerCall: z.number(),
        subtotalCredits: z.number(),
      }),
    ),
  }),

  // 结果统计
  result: z
    .object({
      itemsCandidate: z.number(),
      itemsSelected: z.number(),
      itemsDelivered: z.number(),
      itemsDedupSkipped: z.number(),
      itemsRedelivered: z.number(),
      narrativeTokensUsed: z.number().optional(),
    })
    .nullable(),

  error: z.string().nullable(),
  createdAt: z.date(),
});

export const RunItemResponseSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  canonicalUrlHash: z.string(),

  scoreRelevance: z.number(),
  scoreOverall: z.number(),
  scoringReason: z.string().nullable(),

  rank: z.number(),

  titleSnapshot: z.string(),
  urlSnapshot: z.string(),
  aiSummarySnapshot: z.string().nullable(),

  deliveredAt: z.date().nullable(),
});

// ========== 推断类型 ==========

export type ListRunsQuery = z.infer<typeof ListRunsQuerySchema>;
export type AdminListRunsQuery = z.infer<typeof AdminListRunsQuerySchema>;
export type TriggerRunInput = z.infer<typeof TriggerRunSchema>;
export type RunResponse = z.infer<typeof RunResponseSchema>;
export type RunItemResponse = z.infer<typeof RunItemResponseSchema>;
export type DigestRunStatus = z.infer<typeof DigestRunStatusSchema>;
export type DigestRunSource = z.infer<typeof DigestRunSourceSchema>;
