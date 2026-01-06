/**
 * Vectorize DTOs
 * 使用 Zod 进行运行时验证
 *
 * [DEFINES]: Vectorize request/response schemas
 * [USED_BY]: VectorizeController, VectorizeService
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ==================== Constants ====================

/** 向量化内容最大大小（字符数，约 100KB） */
export const MAX_CONTENT_LENGTH = 100000;

// ==================== Request Schemas ====================

/**
 * 向量化文件请求
 */
export const VectorizeFileSchema = z.object({
  fileId: z.string().uuid('fileId must be a valid UUID'),
  vaultId: z.string().uuid('vaultId must be a valid UUID'),
  fileName: z
    .string()
    .min(1, 'fileName is required')
    .max(500, 'fileName must be at most 500 characters'),
  content: z
    .string()
    .min(1, 'content is required')
    .max(
      MAX_CONTENT_LENGTH,
      `content must be at most ${MAX_CONTENT_LENGTH} characters`,
    ),
});

export class VectorizeFileDto extends createZodDto(VectorizeFileSchema) {}

// ==================== Response Schemas ====================

/**
 * 向量化响应
 */
export const VectorizeResponseSchema = z.object({
  queued: z.boolean(),
  fileId: z.string(),
});

export type VectorizeResponseDto = z.infer<typeof VectorizeResponseSchema>;

/**
 * 向量化任务数据（队列 payload）
 */
export const VectorizeJobDataSchema = z.object({
  userId: z.string(),
  fileId: z.string(),
  vaultId: z.string(),
  fileName: z.string(),
  content: z.string().optional(),
});

export type VectorizeJobData = z.infer<typeof VectorizeJobDataSchema>;

/**
 * 向量化状态类型
 */
export const VectorizeStatusSchema = z.enum([
  'vectorized',
  'pending',
  'processing',
  'failed',
  'not_found',
]);

export type VectorizeStatus = z.infer<typeof VectorizeStatusSchema>;

/**
 * 向量化状态响应
 */
export const VectorizeStatusResponseSchema = z.object({
  status: VectorizeStatusSchema,
  vectorizedAt: z.date().optional(),
  error: z.string().optional(),
});

export type VectorizeStatusResponseDto = z.infer<
  typeof VectorizeStatusResponseSchema
>;
