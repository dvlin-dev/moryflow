/**
 * [DEFINES]: Retrieval public API schemas
 * [USED_BY]: retrieval.controller.ts
 * [POS]: Retrieval Zod request/response schemas
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { z } from 'zod';
import { JsonValueSchema } from '../../common/utils/json.zod';

const OptionalEntityIdSchema = z.string().min(1).optional();
const MetadataSchema = z.record(z.string(), JsonValueSchema).optional();
const SourceTypesSchema = z.array(z.string().min(1)).max(20).optional();
const CategoriesSchema = z.array(z.string().min(1)).max(20).optional();
const GraphEntityContextSchema = z.object({
  id: z.string(),
  entity_type: z.string(),
  canonical_name: z.string(),
  aliases: z.array(z.string()),
});
const GraphRelationContextSchema = z.object({
  id: z.string(),
  relation_type: z.string(),
  confidence: z.number(),
  from: GraphEntityContextSchema,
  to: GraphEntityContextSchema,
});
const GraphContextSchema = z.object({
  entities: z.array(GraphEntityContextSchema),
  relations: z.array(GraphRelationContextSchema),
});

const RetrievalScopeSchema = z.object({
  user_id: OptionalEntityIdSchema,
  agent_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
  metadata: MetadataSchema,
});

const RetrievalGroupLimitsSchema = z.object({
  sources: z.coerce.number().int().min(0).max(50).default(10),
  memory_facts: z.coerce.number().int().min(0).max(50).default(10),
});

export const SearchSourcesSchema = z.object({
  query: z.string().min(1, 'query is required'),
  top_k: z.coerce.number().int().min(1).max(50).default(10),
  threshold: z.coerce.number().min(0).max(1).optional(),
  include_graph_context: z.boolean().optional().default(false),
  source_types: SourceTypesSchema,
  ...RetrievalScopeSchema.shape,
});

export const SearchRetrievalSchema = z.object({
  query: z.string().min(1, 'query is required'),
  threshold: z.coerce.number().min(0).max(1).optional(),
  include_graph_context: z.boolean().optional().default(false),
  scope: RetrievalScopeSchema.default({}),
  group_limits: RetrievalGroupLimitsSchema.default({
    sources: 10,
    memory_facts: 10,
  }),
  source_types: SourceTypesSchema,
  categories: CategoriesSchema,
  filters: JsonValueSchema.optional(),
});

export const SourceSearchResultSchema = z.object({
  result_kind: z.literal('source'),
  id: z.string(),
  score: z.number(),
  rank: z.number().int().positive(),
  source_id: z.string(),
  source_type: z.string(),
  project_id: z.string().nullable(),
  external_id: z.string().nullable(),
  display_path: z.string().nullable(),
  title: z.string(),
  snippet: z.string(),
  matched_chunks: z.array(
    z.object({
      chunk_id: z.string(),
      chunk_index: z.number().int().nonnegative(),
    }),
  ),
  metadata: z.record(z.string(), JsonValueSchema).nullable(),
  graph_context: GraphContextSchema.optional(),
});

export const MemoryFactSearchResultSchema = z.object({
  result_kind: z.literal('memory_fact'),
  id: z.string(),
  score: z.number(),
  rank: z.number().int().positive(),
  memory_fact_id: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), JsonValueSchema).nullable(),
  graph_context: GraphContextSchema.optional(),
});

export const SearchSourcesResponseSchema = z.object({
  results: z.array(SourceSearchResultSchema),
  total: z.number().int().nonnegative(),
});

export const SearchRetrievalResponseSchema = z.object({
  groups: z.object({
    files: z.object({
      items: z.array(SourceSearchResultSchema),
      returned_count: z.number().int().nonnegative(),
      hasMore: z.boolean(),
    }),
    facts: z.object({
      items: z.array(MemoryFactSearchResultSchema),
      returned_count: z.number().int().nonnegative(),
      hasMore: z.boolean(),
    }),
  }),
});

export type SearchSourcesInputDto = z.infer<typeof SearchSourcesSchema>;
export type SearchRetrievalInputDto = z.infer<typeof SearchRetrievalSchema>;
export type SearchSourcesResponseDto = z.infer<
  typeof SearchSourcesResponseSchema
>;
export type SearchRetrievalResponseDto = z.infer<
  typeof SearchRetrievalResponseSchema
>;
