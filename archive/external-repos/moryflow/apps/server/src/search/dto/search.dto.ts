/**
 * Search DTOs
 * 使用 Zod 进行运行时验证
 *
 * [DEFINES]: Search request/response schemas
 * [USED_BY]: SearchController, SearchService
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ==================== Request Schemas ====================

/**
 * 搜索请求
 */
export const SearchSchema = z.object({
  query: z.string().min(1, 'query is required'),
  topK: z.number().int().min(1).max(50).optional().default(10),
  vaultId: z.string().uuid('vaultId must be a valid UUID').optional(),
});

export class SearchDto extends createZodDto(SearchSchema) {}

// ==================== Response Schemas ====================

/**
 * 搜索结果项
 */
export const SearchResultItemSchema = z.object({
  fileId: z.string(),
  score: z.number(),
  title: z.string(),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

/**
 * 搜索响应
 */
export const SearchResponseSchema = z.object({
  results: z.array(SearchResultItemSchema),
  count: z.number().int(),
});

export type SearchResponseDto = z.infer<typeof SearchResponseSchema>;
