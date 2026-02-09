/**
 * [INPUT]: 视频转写 API 请求参数
 * [OUTPUT]: Zod schemas + infer 类型
 * [POS]: Video Transcript DTO schema 定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod';

export const createVideoTranscriptTaskSchema = z.object({
  url: z.string().url().max(2048),
});

export type CreateVideoTranscriptTaskDto = z.infer<
  typeof createVideoTranscriptTaskSchema
>;

export const listVideoTranscriptTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListVideoTranscriptTasksQuery = z.infer<
  typeof listVideoTranscriptTasksQuerySchema
>;

export const updateVideoTranscriptLocalEnabledSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().trim().max(200).optional(),
});

export type UpdateVideoTranscriptLocalEnabledDto = z.infer<
  typeof updateVideoTranscriptLocalEnabledSchema
>;
