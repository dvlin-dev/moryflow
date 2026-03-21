import { z } from 'zod';

const OptionalEntityIdSchema = z.string().min(1).optional();

export const MemoxSourceIdentityBodySchema = z.object({
  title: z.string().min(1).optional(),
  user_id: OptionalEntityIdSchema,
  agent_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
  display_path: z.string().min(1).optional(),
  mime_type: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const MemoxSourceIdentityLookupQuerySchema = z.object({
  user_id: OptionalEntityIdSchema,
  agent_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

export const MemoxSourceIdentityResponseSchema = z.object({
  source_id: z.string(),
  source_type: z.string(),
  external_id: z.string(),
  user_id: z.string().nullable(),
  agent_id: z.string().nullable(),
  app_id: z.string().nullable(),
  run_id: z.string().nullable(),
  org_id: z.string().nullable(),
  project_id: z.string().nullable(),
  title: z.string(),
  display_path: z.string().nullable(),
  mime_type: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  current_revision_id: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const MemoxMatchedChunkSchema = z.object({
  chunk_id: z.string(),
  chunk_index: z.number().int().nonnegative(),
});

export const MemoxSourceSearchItemSchema = z.object({
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
  matched_chunks: z.array(MemoxMatchedChunkSchema),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

export const MemoxSourceSearchRequestSchema = z.object({
  query: z.string().min(1),
  top_k: z.number().int().min(1).max(50),
  include_graph_context: z.boolean().default(false),
  source_types: z.array(z.string().min(1)).max(20).optional(),
  user_id: z.string().min(1),
  project_id: z.string().min(1).optional(),
});

export const MemoxSourceSearchResponseSchema = z.object({
  results: z.array(MemoxSourceSearchItemSchema),
  total: z.number().int().nonnegative(),
});

export const MemoxCreateSourceRevisionBodySchema = z.discriminatedUnion(
  'mode',
  [
    z.object({
      mode: z.literal('inline_text'),
      content: z.string().min(1),
      mime_type: z.string().min(1).optional(),
    }),
  ],
);

export const MemoxSourceRevisionResponseSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  ingest_mode: z.string().optional(),
  status: z.string().optional(),
});

export const MemoxFinalizeSourceRevisionResponseSchema = z.object({
  revision_id: z.string(),
  source_id: z.string().optional(),
});

export type MemoxSourceIdentityBody = z.infer<
  typeof MemoxSourceIdentityBodySchema
>;
export type MemoxSourceIdentityLookupQuery = z.infer<
  typeof MemoxSourceIdentityLookupQuerySchema
>;
export type MemoxSourceIdentityResponse = z.infer<
  typeof MemoxSourceIdentityResponseSchema
>;
export type MemoxSourceSearchItem = z.infer<typeof MemoxSourceSearchItemSchema>;
export type MemoxSourceSearchRequest = z.infer<
  typeof MemoxSourceSearchRequestSchema
>;
export type MemoxSourceSearchResponse = z.infer<
  typeof MemoxSourceSearchResponseSchema
>;
export type MemoxCreateSourceRevisionBody = z.infer<
  typeof MemoxCreateSourceRevisionBodySchema
>;
export type MemoxSourceRevisionResponse = z.infer<
  typeof MemoxSourceRevisionResponseSchema
>;
export type MemoxFinalizeSourceRevisionResponse = z.infer<
  typeof MemoxFinalizeSourceRevisionResponseSchema
>;
