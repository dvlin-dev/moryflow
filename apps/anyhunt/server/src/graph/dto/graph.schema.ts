import { z } from 'zod';
import { JsonValueSchema } from '../../common/utils/json.zod';

const OptionalEntityIdSchema = z.string().min(1).optional();
const MetadataSchema = z.record(z.string(), JsonValueSchema).nullable();

export const GraphScopeSchema = z.object({
  user_id: OptionalEntityIdSchema,
  agent_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
  metadata: z.record(z.string(), JsonValueSchema).optional(),
});

export const GraphEvidenceSummarySchema = z.object({
  observation_count: z.number().int().nonnegative(),
  source_count: z.number().int().nonnegative(),
  memory_fact_count: z.number().int().nonnegative(),
  latest_observed_at: z.string().datetime().nullable(),
});

export const GraphEntityReadSchema = z.object({
  id: z.string(),
  entity_type: z.string(),
  canonical_name: z.string(),
  aliases: z.array(z.string()),
  metadata: MetadataSchema,
  last_seen_at: z.string().datetime().nullable(),
});

export const GraphRelationReadSchema = z.object({
  id: z.string(),
  relation_type: z.string(),
  confidence: z.number(),
  from: GraphEntityReadSchema.pick({
    id: true,
    entity_type: true,
    canonical_name: true,
    aliases: true,
  }),
  to: GraphEntityReadSchema.pick({
    id: true,
    entity_type: true,
    canonical_name: true,
    aliases: true,
  }),
});

export const GraphOverviewResponseSchema = z.object({
  entity_count: z.number().int().nonnegative(),
  relation_count: z.number().int().nonnegative(),
  observation_count: z.number().int().nonnegative(),
  projection_status: z.enum(['idle', 'building', 'ready']),
  last_projected_at: z.string().datetime().nullable(),
});

export const GraphQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  entity_types: z.array(z.string().min(1)).max(20).optional(),
  relation_types: z.array(z.string().min(1)).max(20).optional(),
  scope: GraphScopeSchema.default({}),
});

export const GraphQueryResponseSchema = z.object({
  entities: z.array(GraphEntityReadSchema),
  relations: z.array(GraphRelationReadSchema),
  evidence_summary: GraphEvidenceSummarySchema,
});

export const GraphObservationReadSchema = z.object({
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

export const GraphEntityDetailResponseSchema = z.object({
  entity: GraphEntityReadSchema.extend({
    incoming_relations: z.array(GraphRelationReadSchema),
    outgoing_relations: z.array(GraphRelationReadSchema),
  }),
  evidence_summary: GraphEvidenceSummarySchema,
  recent_observations: z.array(GraphObservationReadSchema),
});

export type GraphQueryInputDto = z.infer<typeof GraphQuerySchema>;
export type GraphOverviewResponseDto = z.infer<
  typeof GraphOverviewResponseSchema
>;
export type GraphQueryResponseDto = z.infer<typeof GraphQueryResponseSchema>;
export type GraphEntityDetailResponseDto = z.infer<
  typeof GraphEntityDetailResponseSchema
>;
