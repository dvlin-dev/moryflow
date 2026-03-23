import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const MetadataSchema = z.record(z.string(), JsonValueSchema).nullable();
const OptionalMetadataInputSchema = z
  .record(z.string(), JsonValueSchema)
  .optional();
const WorkspaceIdSchema = z.string().uuid('workspaceId must be a valid UUID');

export const MemoryWorkspaceScopedQuerySchema = z.object({
  workspaceId: WorkspaceIdSchema,
});

export class MemoryWorkspaceScopedQueryDto extends createZodDto(
  MemoryWorkspaceScopedQuerySchema,
) {}

export const MemoryOverviewResponseSchema = z.object({
  scope: z.object({
    workspaceId: z.string(),
    projectId: z.string(),
    syncVaultId: z.string().nullable(),
  }),
  projection: z.object({
    pending: z.boolean(),
    unresolvedEventCount: z.number().int().nonnegative(),
  }),
  indexing: z.object({
    sourceCount: z.number().int().nonnegative(),
    indexedSourceCount: z.number().int().nonnegative(),
    indexingSourceCount: z.number().int().nonnegative(),
    attentionSourceCount: z.number().int().nonnegative(),
    lastIndexedAt: z.string().datetime().nullable(),
  }),
  facts: z.object({
    manualCount: z.number().int().nonnegative(),
    derivedCount: z.number().int().nonnegative(),
  }),
  graph: z.object({
    entityCount: z.number().int().nonnegative(),
    relationCount: z.number().int().nonnegative(),
    projectionStatus: z.enum([
      'disabled',
      'idle',
      'building',
      'ready',
      'failed',
    ]),
    lastProjectedAt: z.string().datetime().nullable(),
  }),
});

export const MemorySearchSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  query: z.string().trim().min(1, 'query is required'),
  limitPerGroup: z.number().int().min(1).max(50).optional().default(10),
  includeGraphContext: z.boolean().optional().default(false),
});

export class MemorySearchDto extends createZodDto(MemorySearchSchema) {}

export const MemoryKnowledgeStatusFilterSchema = z.enum([
  'ready',
  'attention',
  'indexing',
]);

export const MemoryKnowledgeStatusesQuerySchema = z.object({
  workspaceId: WorkspaceIdSchema,
  filter: MemoryKnowledgeStatusFilterSchema.optional(),
});

export class MemoryKnowledgeStatusesQueryDto extends createZodDto(
  MemoryKnowledgeStatusesQuerySchema,
) {}

export const MemoryFactKindSchema = z.enum(['all', 'manual', 'derived']);

export const MemoryListFactsSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  kind: MemoryFactKindSchema.optional().default('all'),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
  query: z.string().trim().min(1).optional(),
  categories: z.array(z.string().min(1)).max(20).optional(),
});

export class MemoryListFactsDto extends createZodDto(MemoryListFactsSchema) {}

export const MemoryCreateFactSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  text: z.string().trim().min(1, 'text is required'),
  metadata: OptionalMetadataInputSchema,
  categories: z.array(z.string().min(1)).max(20).optional(),
});

export class MemoryCreateFactDto extends createZodDto(MemoryCreateFactSchema) {}

export const MemoryUpdateFactSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  text: z.string().trim().min(1, 'text is required'),
  metadata: OptionalMetadataInputSchema,
});

export class MemoryUpdateFactDto extends createZodDto(MemoryUpdateFactSchema) {}

export const MemoryBatchUpdateFactsSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  facts: z
    .array(
      z.object({
        factId: z.string().min(1),
        text: z.string().trim().min(1, 'text is required'),
      }),
    )
    .min(1)
    .max(100),
});

export class MemoryBatchUpdateFactsDto extends createZodDto(
  MemoryBatchUpdateFactsSchema,
) {}

export const MemoryBatchDeleteFactsSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  factIds: z.array(z.string().min(1)).min(1).max(100),
});

export class MemoryBatchDeleteFactsDto extends createZodDto(
  MemoryBatchDeleteFactsSchema,
) {}

export const MemoryFeedbackSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  factId: z.string().min(1),
  feedback: z.enum(['positive', 'negative', 'very_negative']),
  reason: z.string().trim().min(1).optional(),
});

export class MemoryFeedbackDto extends createZodDto(MemoryFeedbackSchema) {}

export const MemoryFeedbackBodySchema = MemoryFeedbackSchema.omit({
  factId: true,
});

export class MemoryFeedbackBodyDto extends createZodDto(
  MemoryFeedbackBodySchema,
) {}

export const MemoryGraphQuerySchema = z.object({
  workspaceId: WorkspaceIdSchema,
  query: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  entityTypes: z.array(z.string().min(1)).max(20).optional(),
  relationTypes: z.array(z.string().min(1)).max(20).optional(),
});

export class MemoryGraphQueryDto extends createZodDto(MemoryGraphQuerySchema) {}

export const MemoryEntityDetailQuerySchema = z.object({
  workspaceId: WorkspaceIdSchema,
});

export class MemoryEntityDetailQueryDto extends createZodDto(
  MemoryEntityDetailQuerySchema,
) {}

export const MemoryCreateExportSchema = z.object({
  workspaceId: WorkspaceIdSchema,
});

export class MemoryCreateExportDto extends createZodDto(
  MemoryCreateExportSchema,
) {}

export const MemoryGetExportSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  exportId: z.string().min(1),
});

export class MemoryGetExportDto extends createZodDto(MemoryGetExportSchema) {}

export const MemoryScopeSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  syncVaultId: z.string().nullable(),
});

export const MemoryFactSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.enum(['manual', 'source-derived']),
  readOnly: z.boolean(),
  metadata: MetadataSchema,
  categories: z.array(z.string()),
  sourceId: z.string().nullable(),
  sourceRevisionId: z.string().nullable(),
  derivedKey: z.string().nullable(),
  expirationDate: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const MemorySearchFileItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  workspaceId: z.string().nullable(),
  sourceId: z.string(),
  title: z.string(),
  path: z.string().nullable(),
  snippet: z.string(),
  score: z.number(),
});

export const MemorySearchFactItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.enum(['manual', 'source-derived']),
  readOnly: z.boolean(),
  metadata: MetadataSchema,
  score: z.number(),
  sourceId: z.string().nullable(),
});

export const MemorySearchResponseSchema = z.object({
  scope: MemoryScopeSchema,
  query: z.string(),
  groups: z.object({
    files: z.object({
      items: z.array(MemorySearchFileItemSchema),
      returnedCount: z.number().int().nonnegative(),
      hasMore: z.boolean(),
    }),
    facts: z.object({
      items: z.array(MemorySearchFactItemSchema),
      returnedCount: z.number().int().nonnegative(),
      hasMore: z.boolean(),
    }),
  }),
});

export const MemoryKnowledgeStatusItemSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  path: z.string().nullable(),
  state: z.enum(['READY', 'INDEXING', 'NEEDS_ATTENTION']),
  userFacingReason: z.string().nullable(),
  lastAttemptAt: z.string().datetime().nullable(),
});

export const MemoryKnowledgeStatusesResponseSchema = z.object({
  scope: MemoryScopeSchema,
  items: z.array(MemoryKnowledgeStatusItemSchema),
});

export const MemoryListFactsResponseSchema = z.object({
  scope: MemoryScopeSchema,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasMore: z.boolean(),
  items: z.array(MemoryFactSchema),
});

export const MemoryHistoryItemSchema = z.object({
  id: z.string(),
  factId: z.string(),
  event: z.string(),
  oldText: z.string().nullable(),
  newText: z.string().nullable(),
  metadata: z.unknown().nullable().optional(),
  input: z.unknown().nullable().optional(),
  createdAt: z.string().datetime(),
  userId: z.string().nullable().optional(),
});

export const MemoryHistoryResponseSchema = z.object({
  scope: MemoryScopeSchema,
  items: z.array(MemoryHistoryItemSchema),
});

export const MemoryFeedbackResponseSchema = z.object({
  id: z.string(),
  feedback: z.enum(['positive', 'negative', 'very_negative']).nullable(),
  reason: z.string().nullable(),
});

export const MemoryGraphEntitySchema = z.object({
  id: z.string(),
  entityType: z.string(),
  canonicalName: z.string(),
  aliases: z.array(z.string()),
  metadata: MetadataSchema,
  lastSeenAt: z.string().datetime().nullable(),
});

export const MemoryGraphRelationSchema = z.object({
  id: z.string(),
  relationType: z.string(),
  confidence: z.number(),
  from: z.object({
    id: z.string(),
    entityType: z.string(),
    canonicalName: z.string(),
    aliases: z.array(z.string()),
  }),
  to: z.object({
    id: z.string(),
    entityType: z.string(),
    canonicalName: z.string(),
    aliases: z.array(z.string()),
  }),
});

export const MemoryGraphEvidenceSummarySchema = z.object({
  observationCount: z.number().int().nonnegative(),
  sourceCount: z.number().int().nonnegative(),
  memoryFactCount: z.number().int().nonnegative(),
  latestObservedAt: z.string().datetime().nullable(),
});

export const MemoryGraphQueryResponseSchema = z.object({
  scope: MemoryScopeSchema,
  entities: z.array(MemoryGraphEntitySchema),
  relations: z.array(MemoryGraphRelationSchema),
  evidenceSummary: MemoryGraphEvidenceSummarySchema,
});

export const MemoryGraphObservationSchema = z.object({
  id: z.string(),
  observationType: z.string(),
  confidence: z.number().nullable(),
  evidenceSourceId: z.string().nullable(),
  evidenceRevisionId: z.string().nullable(),
  evidenceChunkId: z.string().nullable(),
  evidenceMemoryId: z.string().nullable(),
  payload: z.record(z.string(), JsonValueSchema),
  createdAt: z.string().datetime(),
});

export const MemoryEntityDetailResponseSchema = z.object({
  entity: MemoryGraphEntitySchema.extend({
    incomingRelations: z.array(MemoryGraphRelationSchema),
    outgoingRelations: z.array(MemoryGraphRelationSchema),
  }),
  evidenceSummary: MemoryGraphEvidenceSummarySchema,
  recentObservations: z.array(MemoryGraphObservationSchema),
});

export const MemoryCreateExportResponseSchema = z.object({
  exportId: z.string(),
});

export const MemoryGetExportResponseSchema = z.object({
  scope: MemoryScopeSchema,
  items: z.array(MemoryFactSchema),
});

export const AnyhuntMemorySchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: MetadataSchema,
  categories: z.array(z.string()).optional().default([]),
  immutable: z.boolean(),
  origin_kind: z.enum(['MANUAL', 'SOURCE_DERIVED']),
  source_id: z.string().nullable(),
  source_revision_id: z.string().nullable(),
  derived_key: z.string().nullable(),
  expiration_date: z.string().nullable(),
  user_id: z.string().nullable(),
  project_id: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const AnyhuntMemoryListSchema = z.array(AnyhuntMemorySchema);

export const AnyhuntMemoryCreateResultSchema = z.object({
  id: z.string(),
  data: z.object({
    content: z.string(),
  }),
  event: z.string(),
});

export const AnyhuntMemoryCreateResponseSchema = z.object({
  results: z.array(AnyhuntMemoryCreateResultSchema),
});

export const AnyhuntMemoryUpdateResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: MetadataSchema,
  user_id: z.string().nullable(),
  agent_id: z.string().nullable().optional(),
  app_id: z.string().nullable().optional(),
  run_id: z.string().nullable().optional(),
  hash: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const AnyhuntMemoryOverviewSchema = z.object({
  indexing: z.object({
    source_count: z.number().int().nonnegative(),
    indexed_source_count: z.number().int().nonnegative(),
    indexing_source_count: z.number().int().nonnegative(),
    attention_source_count: z.number().int().nonnegative(),
    last_indexed_at: z.string().datetime().nullable(),
  }),
  facts: z.object({
    manual_count: z.number().int().nonnegative(),
    derived_count: z.number().int().nonnegative(),
  }),
  graph: z.object({
    entity_count: z.number().int().nonnegative(),
    relation_count: z.number().int().nonnegative(),
    projection_status: z.enum([
      'disabled',
      'idle',
      'building',
      'ready',
      'failed',
    ]),
    last_projected_at: z.string().datetime().nullable(),
  }),
});

export const AnyhuntKnowledgeStatusItemSchema = z.object({
  document_id: z.string(),
  title: z.string(),
  path: z.string().nullable(),
  state: z.enum(['READY', 'INDEXING', 'NEEDS_ATTENTION']),
  user_facing_reason: z.string().nullable(),
  last_attempt_at: z.string().datetime().nullable(),
});

export const AnyhuntKnowledgeStatusesResponseSchema = z.object({
  items: z.array(AnyhuntKnowledgeStatusItemSchema),
});

export const AnyhuntMemoryHistoryItemSchema = z.object({
  id: z.string(),
  memory_id: z.string(),
  event: z.string(),
  old_content: z.string().nullable(),
  new_content: z.string().nullable(),
  metadata: z.unknown().nullable().optional(),
  input: z.unknown().nullable().optional(),
  created_at: z.string().datetime(),
  user_id: z.string().nullable().optional(),
});

export const AnyhuntMemoryHistorySchema = z.array(
  AnyhuntMemoryHistoryItemSchema,
);

export const AnyhuntMemoryFeedbackResponseSchema = z.object({
  id: z.string(),
  feedback: z.enum(['POSITIVE', 'NEGATIVE', 'VERY_NEGATIVE']).nullable(),
  feedback_reason: z.string().nullable(),
});

export const AnyhuntGraphEntitySchema = z.object({
  id: z.string(),
  entity_type: z.string(),
  canonical_name: z.string(),
  aliases: z.array(z.string()),
  metadata: MetadataSchema,
  last_seen_at: z.string().datetime().nullable(),
});

export const AnyhuntGraphRelationSchema = z.object({
  id: z.string(),
  relation_type: z.string(),
  confidence: z.number(),
  from: z.object({
    id: z.string(),
    entity_type: z.string(),
    canonical_name: z.string(),
    aliases: z.array(z.string()),
  }),
  to: z.object({
    id: z.string(),
    entity_type: z.string(),
    canonical_name: z.string(),
    aliases: z.array(z.string()),
  }),
});

export const AnyhuntGraphEvidenceSummarySchema = z.object({
  observation_count: z.number().int().nonnegative(),
  source_count: z.number().int().nonnegative(),
  memory_fact_count: z.number().int().nonnegative(),
  latest_observed_at: z.string().datetime().nullable(),
});

export const AnyhuntGraphQueryResponseSchema = z.object({
  entities: z.array(AnyhuntGraphEntitySchema),
  relations: z.array(AnyhuntGraphRelationSchema),
  evidence_summary: AnyhuntGraphEvidenceSummarySchema,
});

export const AnyhuntGraphObservationSchema = z.object({
  id: z.string(),
  observation_type: z.string(),
  confidence: z.number().nullable(),
  evidence_source_id: z.string().nullable(),
  evidence_revision_id: z.string().nullable(),
  evidence_chunk_id: z.string().nullable(),
  evidence_memory_id: z.string().nullable(),
  payload: z.record(z.string(), JsonValueSchema),
  created_at: z.string().datetime(),
});

export const AnyhuntGraphEntityDetailSchema = z.object({
  entity: AnyhuntGraphEntitySchema.extend({
    incoming_relations: z.array(AnyhuntGraphRelationSchema),
    outgoing_relations: z.array(AnyhuntGraphRelationSchema),
  }),
  evidence_summary: AnyhuntGraphEvidenceSummarySchema,
  recent_observations: z.array(AnyhuntGraphObservationSchema),
});

export const AnyhuntRetrievalSearchResponseSchema = z.object({
  groups: z.object({
    files: z.object({
      items: z.array(
        z.object({
          id: z.string(),
          result_kind: z.literal('source'),
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
          metadata: MetadataSchema,
        }),
      ),
      returned_count: z.number().int().nonnegative(),
      hasMore: z.boolean(),
    }),
    facts: z.object({
      items: z.array(
        z.object({
          id: z.string(),
          result_kind: z.literal('memory_fact'),
          score: z.number(),
          rank: z.number().int().positive(),
          memory_fact_id: z.string(),
          content: z.string(),
          metadata: MetadataSchema,
          origin_kind: z.enum(['MANUAL', 'SOURCE_DERIVED']),
          immutable: z.boolean(),
          source_id: z.string().nullable(),
          source_revision_id: z.string().nullable(),
          derived_key: z.string().nullable(),
        }),
      ),
      returned_count: z.number().int().nonnegative(),
      hasMore: z.boolean(),
    }),
  }),
});

export const AnyhuntExportCreateResponseSchema = z.object({
  memory_export_id: z.string(),
});

export const AnyhuntExportGetResponseSchema = z.object({
  results: z.array(AnyhuntMemorySchema),
});

export type MemoryOverviewResponseDto = z.infer<
  typeof MemoryOverviewResponseSchema
>;
export type MemoryKnowledgeStatusesQueryInput = z.infer<
  typeof MemoryKnowledgeStatusesQuerySchema
>;
export type MemoryKnowledgeStatusesResponseDto = z.infer<
  typeof MemoryKnowledgeStatusesResponseSchema
>;
export type MemorySearchInput = z.infer<typeof MemorySearchSchema>;
export type MemorySearchResponseDto = z.infer<
  typeof MemorySearchResponseSchema
>;
export type MemoryListFactsInput = z.infer<typeof MemoryListFactsSchema>;
export type MemoryListFactsResponseDto = z.infer<
  typeof MemoryListFactsResponseSchema
>;
export type MemoryCreateFactInput = z.infer<typeof MemoryCreateFactSchema>;
export type MemoryFactDto = z.infer<typeof MemoryFactSchema>;
export type MemoryUpdateFactInput = z.infer<typeof MemoryUpdateFactSchema>;
export type MemoryBatchUpdateFactsInput = z.infer<
  typeof MemoryBatchUpdateFactsSchema
>;
export type MemoryBatchDeleteFactsInput = z.infer<
  typeof MemoryBatchDeleteFactsSchema
>;
export type MemoryFeedbackInput = z.infer<typeof MemoryFeedbackSchema>;
export type MemoryFeedbackResponseDto = z.infer<
  typeof MemoryFeedbackResponseSchema
>;
export type MemoryGraphQueryInput = z.infer<typeof MemoryGraphQuerySchema>;
export type MemoryGraphQueryResponseDto = z.infer<
  typeof MemoryGraphQueryResponseSchema
>;
export type MemoryEntityDetailQueryInput = z.infer<
  typeof MemoryEntityDetailQuerySchema
>;
export type MemoryEntityDetailResponseDto = z.infer<
  typeof MemoryEntityDetailResponseSchema
>;
export type MemoryCreateExportInput = z.infer<typeof MemoryCreateExportSchema>;
export type MemoryGetExportInput = z.infer<typeof MemoryGetExportSchema>;
export type MemoryCreateExportResponseDto = z.infer<
  typeof MemoryCreateExportResponseSchema
>;
export type MemoryGetExportResponseDto = z.infer<
  typeof MemoryGetExportResponseSchema
>;
export type MemoryHistoryResponseDto = z.infer<
  typeof MemoryHistoryResponseSchema
>;
export type AnyhuntMemoryDto = z.infer<typeof AnyhuntMemorySchema>;
export type AnyhuntKnowledgeStatusItemDto = z.infer<
  typeof AnyhuntKnowledgeStatusItemSchema
>;
