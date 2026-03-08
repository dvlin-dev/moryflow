/**
 * Extract API DTO validation schemas
 *
 * [INPUT]: Request body validation using Zod
 * [OUTPUT]: Type-safe DTOs inferred from schemas
 * [POS]: Used by extract.controller.ts for request validation
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import { z } from 'zod';

/**
 * Extract API request parameters schema
 */
export const ExtractOptionsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(20),
  prompt: z.string().max(5000).optional(),
  schema: z.record(z.string(), z.unknown()).optional(), // JSON Schema
  systemPrompt: z.string().max(2000).optional(),
  /** Optional: Specify modelId (defaults to Admin defaultExtractModelId) */
  model: z.string().max(200).optional(),
});

export type ExtractOptions = z.infer<typeof ExtractOptionsSchema>;
