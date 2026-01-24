/**
 * Memory module Zod schemas
 *
 * [DEFINES]: CreateMemorySchema, SearchMemorySchema, ListMemoryQuerySchema, etc.
 * [USED_BY]: memory.controller.ts, memory.service.ts
 */
import { z } from 'zod';
import { JsonValueSchema } from '../../common/utils/json.zod';

// ========== Field Schemas ==========

const EntityIdSchema = z.string().min(1, 'id is required');
const OptionalEntityIdSchema = z.string().min(1).optional();
const TimestampSchema = z.number().int().positive().optional();
const DateStringSchema = z.string().min(1).optional();

const MessagesSchema = z
  .array(z.record(z.string(), z.string().nullable()))
  .min(1, 'messages is required');

const MetadataSchema = z.record(z.string(), JsonValueSchema).optional();
const CategoriesSchema = z.array(z.string()).optional();

const OutputFormatSchema = z.enum(['v1.0', 'v1.1']).optional().default('v1.1');

const VersionSchema = z.literal('v1').optional();

// ========== Request Schemas ==========

export const CreateMemorySchema = z.object({
  messages: MessagesSchema,
  agent_id: OptionalEntityIdSchema,
  user_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  metadata: MetadataSchema,
  includes: z.string().min(1).optional(),
  excludes: z.string().min(1).optional(),
  infer: z.boolean().optional().default(true),
  output_format: OutputFormatSchema,
  custom_categories: z.record(z.string(), JsonValueSchema).optional(),
  custom_instructions: z.string().min(1).optional(),
  immutable: z.boolean().optional().default(false),
  async_mode: z.boolean().optional().default(true),
  timestamp: TimestampSchema,
  expiration_date: DateStringSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
  version: VersionSchema,
  enable_graph: z.boolean().optional().default(false),
});

export const SearchMemorySchema = z.object({
  query: z.string().min(1, 'query is required'),
  agent_id: OptionalEntityIdSchema,
  user_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  metadata: MetadataSchema,
  filters: JsonValueSchema.optional(),
  top_k: z.coerce.number().int().min(1).max(100).default(10),
  threshold: z.coerce.number().min(0).max(1).optional(),
  fields: z.array(z.string()).optional(),
  rerank: z.boolean().optional().default(false),
  keyword_search: z.boolean().optional().default(false),
  output_format: OutputFormatSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
  filter_memories: z.boolean().optional().default(false),
  categories: CategoriesSchema,
  only_metadata_based_search: z.boolean().optional().default(false),
});

export const ListMemoryQuerySchema = z.object({
  user_id: OptionalEntityIdSchema,
  agent_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  metadata: MetadataSchema,
  filters: JsonValueSchema.optional(),
  categories: CategoriesSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
  fields: z.array(z.string()).optional(),
  keywords: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(1000).optional().default(100),
  start_date: DateStringSchema,
  end_date: DateStringSchema,
});

export const DeleteMemoriesQuerySchema = z
  .object({
    user_id: OptionalEntityIdSchema,
    agent_id: OptionalEntityIdSchema,
    app_id: OptionalEntityIdSchema,
    run_id: OptionalEntityIdSchema,
    metadata: MetadataSchema,
    org_id: OptionalEntityIdSchema,
    project_id: OptionalEntityIdSchema,
  })
  .refine(
    (data) =>
      Boolean(data.user_id || data.agent_id || data.app_id || data.run_id),
    { message: 'One of user_id, agent_id, app_id, run_id is required' },
  );

export const UpdateMemorySchema = z.object({
  text: z.string().min(1, 'text is required'),
  metadata: MetadataSchema,
});

export const BatchUpdateSchema = z.object({
  memories: z
    .array(
      z.object({
        memory_id: EntityIdSchema,
        text: z.string().min(1, 'text is required'),
      }),
    )
    .min(1)
    .max(1000),
});

export const BatchDeleteSchema = z.object({
  memory_ids: z.array(EntityIdSchema).min(1).max(1000),
});

export const FeedbackSchema = z.object({
  memory_id: EntityIdSchema,
  feedback: z.enum(['POSITIVE', 'NEGATIVE', 'VERY_NEGATIVE']).optional(),
  feedback_reason: z.string().optional(),
});

export const ExportCreateSchema = z.object({
  schema: z.record(z.string(), JsonValueSchema),
  filters: z.record(z.string(), JsonValueSchema).optional(),
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

export const ExportGetSchema = z.object({
  memory_export_id: EntityIdSchema.optional(),
  filters: z.record(z.string(), JsonValueSchema).optional(),
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

// ========== Response Schemas ==========

export const MemorySchema = z.object({
  id: z.string(),
  memory: z.string(),
  input: z.array(z.record(z.string(), z.string().nullable())).optional(),
  owner: z.string().optional(),
  organization: z.string().nullable().optional(),
  user_id: z.string().nullable(),
  agent_id: z.string().nullable(),
  app_id: z.string().nullable(),
  run_id: z.string().nullable(),
  org_id: z.string().nullable(),
  project_id: z.string().nullable(),
  metadata: z.record(z.string(), JsonValueSchema).nullable(),
  categories: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  hash: z.string().nullable().optional(),
  immutable: z.boolean(),
  expiration_date: z.string().nullable(),
  timestamp: z.number().nullable().optional(),
  entities: JsonValueSchema.optional(),
  relations: JsonValueSchema.optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MemoryListResponseSchema = z.object({
  data: z.array(MemorySchema),
});

// ========== Inferred Types ==========

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type SearchMemoryInput = z.infer<typeof SearchMemorySchema>;
export type ListMemoryQuery = z.infer<typeof ListMemoryQuerySchema>;
export type DeleteMemoriesQuery = z.infer<typeof DeleteMemoriesQuerySchema>;
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;
export type BatchUpdateInput = z.infer<typeof BatchUpdateSchema>;
export type BatchDeleteInput = z.infer<typeof BatchDeleteSchema>;
export type FeedbackInput = z.infer<typeof FeedbackSchema>;
export type ExportCreateInput = z.infer<typeof ExportCreateSchema>;
export type ExportGetInput = z.infer<typeof ExportGetSchema>;
export type MemoryResponse = z.infer<typeof MemorySchema>;
export type MemoryListResponse = z.infer<typeof MemoryListResponseSchema>;
