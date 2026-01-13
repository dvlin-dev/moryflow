/**
 * Digest Topic Report DTO - Zod Schemas
 *
 * [INPUT]: 举报创建/查询/处理请求参数
 * [OUTPUT]: 验证后的举报数据
 * [POS]: Zod schemas + 推断类型
 */

import { z } from 'zod';

// ========== 枚举 Schema ==========

export const DigestTopicReportReasonSchema = z.enum([
  'SPAM',
  'COPYRIGHT',
  'INAPPROPRIATE',
  'MISLEADING',
  'OTHER',
]);

export const DigestTopicReportStatusSchema = z.enum([
  'PENDING',
  'RESOLVED_VALID',
  'RESOLVED_INVALID',
  'DISMISSED',
]);

// ========== 创建举报 Schema ==========

export const CreateReportSchema = z.object({
  topicId: z.string(),
  reason: DigestTopicReportReasonSchema,
  description: z.string().max(1000).optional(),
});

// ========== 处理举报 Schema ==========

export const ResolveReportSchema = z.object({
  status: DigestTopicReportStatusSchema.refine(
    (val) => val !== 'PENDING',
    'Cannot set status to PENDING',
  ),
  resolveNote: z.string().max(500).optional(),
  /** 是否同时暂停话题（仅当 status=RESOLVED_VALID 时有效） */
  pauseTopic: z.boolean().optional(),
});

// ========== 查询 Schema ==========

export const ListReportsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: DigestTopicReportStatusSchema.optional(),
  topicId: z.string().optional(),
});

// ========== 响应 Schema ==========

export const ReportResponseSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  reason: DigestTopicReportReasonSchema,
  description: z.string().nullable(),
  status: DigestTopicReportStatusSchema,
  createdAt: z.date(),
  resolvedAt: z.date().nullable(),
  resolveNote: z.string().nullable(),
  topic: z
    .object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
    })
    .optional(),
});

// ========== 推断类型 ==========

export type DigestTopicReportReason = z.infer<
  typeof DigestTopicReportReasonSchema
>;
export type DigestTopicReportStatus = z.infer<
  typeof DigestTopicReportStatusSchema
>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;
export type ListReportsQuery = z.infer<typeof ListReportsQuerySchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
