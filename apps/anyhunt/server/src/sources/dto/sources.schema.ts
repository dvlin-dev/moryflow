/**
 * [DEFINES]: Sources public API schemas
 * [USED_BY]: sources controllers
 * [POS]: Sources Zod request/response schemas
 */

import { z } from 'zod';
import { JsonValueSchema } from '../../common/utils/json.zod';

const OptionalEntityIdSchema = z.string().min(1).optional();
const MetadataSchema = z.record(z.string(), JsonValueSchema).optional();
const UpdatableMetadataSchema = z
  .record(z.string(), JsonValueSchema)
  .nullable()
  .optional();

export const CreateKnowledgeSourceSchema = z.object({
  source_type: z.string().min(1, 'source_type is required'),
  external_id: z.string().min(1).optional(),
  user_id: OptionalEntityIdSchema,
  agent_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
  title: z.string().min(1, 'title is required'),
  display_path: z.string().min(1).optional(),
  mime_type: z.string().min(1).optional(),
  metadata: MetadataSchema,
});

export const ResolveSourceIdentitySchema = z.object({
  title: z.string().min(1).optional(),
  user_id: OptionalEntityIdSchema,
  agent_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
  display_path: z.string().min(1).optional(),
  mime_type: z.string().min(1).optional(),
  metadata: UpdatableMetadataSchema,
});

export const LookupSourceIdentitySchema = z.object({
  user_id: OptionalEntityIdSchema,
  agent_id: OptionalEntityIdSchema,
  app_id: OptionalEntityIdSchema,
  run_id: OptionalEntityIdSchema,
  org_id: OptionalEntityIdSchema,
  project_id: OptionalEntityIdSchema,
});

export const SourceStatusFilterSchema = z
  .enum(['ready', 'attention', 'indexing'])
  .optional();

export const ListSourceStatusesQuerySchema = LookupSourceIdentitySchema.extend({
  filter: SourceStatusFilterSchema,
});

export const CreateInlineSourceRevisionSchema = z.object({
  mode: z.literal('inline_text'),
  content: z.string().min(1, 'content is required'),
  mime_type: z.string().min(1).optional(),
});

export const CreateUploadBlobSourceRevisionSchema = z.object({
  mode: z.literal('upload_blob'),
  mime_type: z.string().min(1).optional(),
  filename: z.string().min(1).optional(),
});

export const CreateSourceRevisionSchema = z.discriminatedUnion('mode', [
  CreateInlineSourceRevisionSchema,
  CreateUploadBlobSourceRevisionSchema,
]);

export const SourceUploadSessionSchema = z.object({
  upload_url: z.string().url(),
  headers: z.record(z.string(), z.string()),
  expires_at: z.number().int().positive(),
  revision_id: z.string(),
});

export const SourceResponseSchema = z.object({
  id: z.string(),
  source_type: z.string(),
  external_id: z.string().nullable(),
  user_id: z.string().nullable(),
  agent_id: z.string().nullable(),
  app_id: z.string().nullable(),
  run_id: z.string().nullable(),
  org_id: z.string().nullable(),
  project_id: z.string().nullable(),
  title: z.string(),
  display_path: z.string().nullable(),
  mime_type: z.string().nullable(),
  metadata: z.record(z.string(), JsonValueSchema).nullable(),
  current_revision_id: z.string().nullable(),
  latest_revision_id: z.string().nullable(),
  status: z.enum(['ACTIVE', 'DELETED']),
  created_at: z.string(),
  updated_at: z.string(),
});

export const SourceIdentityResponseSchema = z.object({
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
  metadata: z.record(z.string(), JsonValueSchema).nullable(),
  current_revision_id: z.string().nullable(),
  latest_revision_id: z.string().nullable(),
  status: z.enum(['ACTIVE', 'DELETED']),
  created_at: z.string(),
  updated_at: z.string(),
});

export const SourceRevisionResponseSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  ingest_mode: z.string(),
  checksum: z.string().nullable(),
  user_id: z.string().nullable(),
  agent_id: z.string().nullable(),
  app_id: z.string().nullable(),
  run_id: z.string().nullable(),
  org_id: z.string().nullable(),
  project_id: z.string().nullable(),
  content_bytes: z.number().int().nullable(),
  content_tokens: z.number().int().nullable(),
  normalized_text_r2_key: z.string().nullable(),
  blob_r2_key: z.string().nullable(),
  mime_type: z.string().nullable(),
  status: z.string(),
  error: z.string().nullable(),
  pending_upload_expires_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  indexed_at: z.string().nullable(),
  upload_session: SourceUploadSessionSchema.optional(),
});

export const SourceStatusItemResponseSchema = z.object({
  document_id: z.string(),
  title: z.string(),
  path: z.string().nullable(),
  state: z.enum(['READY', 'INDEXING', 'NEEDS_ATTENTION']),
  user_facing_reason: z.string().nullable(),
  last_attempt_at: z.string().datetime().nullable(),
});

export const SourceStatusListResponseSchema = z.object({
  items: z.array(SourceStatusItemResponseSchema),
});

export const FinalizedSourceRevisionResponseSchema = z.object({
  revision_id: z.string(),
  source_id: z.string(),
  chunk_count: z.number().int(),
  content_bytes: z.number().int(),
  content_tokens: z.number().int(),
  checksum: z.string(),
  normalized_text_r2_key: z.string(),
});

export type CreateKnowledgeSourceInputDto = z.infer<
  typeof CreateKnowledgeSourceSchema
>;
export type ResolveSourceIdentityInputDto = z.infer<
  typeof ResolveSourceIdentitySchema
>;
export type LookupSourceIdentityInputDto = z.infer<
  typeof LookupSourceIdentitySchema
>;
export type ListSourceStatusesQueryDto = z.infer<
  typeof ListSourceStatusesQuerySchema
>;
export type CreateInlineSourceRevisionInputDto = z.infer<
  typeof CreateInlineSourceRevisionSchema
>;
export type CreateUploadBlobSourceRevisionInputDto = z.infer<
  typeof CreateUploadBlobSourceRevisionSchema
>;
export type CreateSourceRevisionInputDto = z.infer<
  typeof CreateSourceRevisionSchema
>;
export type SourceUploadSessionDto = z.infer<typeof SourceUploadSessionSchema>;
export type SourceResponseDto = z.infer<typeof SourceResponseSchema>;
export type SourceIdentityResponseDto = z.infer<
  typeof SourceIdentityResponseSchema
>;
export type SourceRevisionResponseDto = z.infer<
  typeof SourceRevisionResponseSchema
>;
export type SourceStatusItemResponseDto = z.infer<
  typeof SourceStatusItemResponseSchema
>;
export type SourceStatusListResponseDto = z.infer<
  typeof SourceStatusListResponseSchema
>;
export type FinalizedSourceRevisionResponseDto = z.infer<
  typeof FinalizedSourceRevisionResponseSchema
>;
