/**
 * Memory module Zod schemas
 *
 * [DEFINES]: CreateMemorySchema, SearchMemorySchema, MemorySchema, etc.
 * [USED_BY]: memory.controller.ts, memory.service.ts
 */
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ========== Field Schemas ==========

const UserIdSchema = z.string().min(1, 'userId is required');

const ContentSchema = z
  .string()
  .min(1, 'Content is required')
  .max(50000, 'Content too long (max 50000 characters)');

const MetadataSchema = z.record(z.string(), z.unknown()).optional();

const ImportanceSchema = z.number().min(0).max(1).optional();

const TagsSchema = z.array(z.string()).optional();

// ========== Request Schemas ==========

export const CreateMemorySchema = z.object({
  userId: UserIdSchema,
  content: ContentSchema,
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: MetadataSchema,
  source: z.string().optional(),
  importance: ImportanceSchema,
  tags: TagsSchema,
});

export const SearchMemorySchema = z.object({
  userId: UserIdSchema,
  query: z.string().min(1, 'Query is required'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  threshold: z.coerce.number().min(0).max(1).default(0.7),
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
});

export const ListMemoryQuerySchema = z.object({
  userId: UserIdSchema,
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  agentId: z.string().optional(),
  sessionId: z.string().optional(),
});

// ========== Response Schemas ==========

export const MemorySchema = z.object({
  id: z.string(),
  apiKeyId: z.string(),
  userId: z.string(),
  agentId: z.string().nullable(),
  sessionId: z.string().nullable(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  source: z.string().nullable(),
  importance: z.number().nullable(),
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MemoryWithSimilaritySchema = MemorySchema.extend({
  similarity: z.number(),
});

export const MemoryListResponseSchema = z.object({
  data: z.array(MemorySchema),
  total: z.number(),
});

// ========== Inferred Types ==========

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type SearchMemoryInput = z.infer<typeof SearchMemorySchema>;
export type ListMemoryQuery = z.infer<typeof ListMemoryQuerySchema>;
export type MemoryResponse = z.infer<typeof MemorySchema>;
// Note: MemoryWithSimilarity is defined in memory.repository.ts
export type MemoryListResponse = z.infer<typeof MemoryListResponseSchema>;

// ========== DTO Classes ==========

export class CreateMemoryDto extends createZodDto(CreateMemorySchema) {}
export class SearchMemoryDto extends createZodDto(SearchMemorySchema) {}
export class ListMemoryQueryDto extends createZodDto(ListMemoryQuerySchema) {}
