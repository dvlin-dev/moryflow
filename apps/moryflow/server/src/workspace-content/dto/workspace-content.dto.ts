import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const WorkspaceIdSchema = z.string().uuid('workspaceId must be a valid UUID');
const DocumentIdSchema = z.string().trim().min(1, 'documentId is required').max(128, 'documentId exceeds maximum length');
const PathSchema = z.string().trim().min(1, 'path is required');
const TitleSchema = z.string().trim().min(1, 'title is required');
const ContentHashSchema = z.string().trim().min(1, 'contentHash is required');

const InlineTextDocumentSchema = z.object({
  documentId: DocumentIdSchema,
  path: PathSchema,
  title: TitleSchema,
  mimeType: z.string().trim().min(1).optional(),
  contentHash: ContentHashSchema,
  contentBytes: z.number().int().nonnegative().optional(),
  mode: z.literal('inline_text'),
  contentText: z.string().min(1, 'contentText is required').max(2_097_152, 'contentText exceeds 2 MB limit'),
});

const SyncObjectRefDocumentSchema = z.object({
  documentId: DocumentIdSchema,
  path: PathSchema,
  title: TitleSchema,
  mimeType: z.string().trim().min(1).optional(),
  contentHash: ContentHashSchema,
  mode: z.literal('sync_object_ref'),
  vaultId: z.string().trim().min(1, 'vaultId is required'),
  fileId: z.string().trim().min(1, 'fileId is required'),
  storageRevision: z.string().trim().min(1, 'storageRevision is required'),
});

export const WorkspaceContentDocumentSchema = z.discriminatedUnion('mode', [
  InlineTextDocumentSchema,
  SyncObjectRefDocumentSchema,
]);

export const WorkspaceContentBatchUpsertSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  documents: z.array(WorkspaceContentDocumentSchema).min(1).max(500).refine(
    (docs) => new Set(docs.map((d) => d.documentId)).size === docs.length,
    { message: 'Duplicate documentId in batch' },
  ),
});

export class WorkspaceContentBatchUpsertDto extends createZodDto(
  WorkspaceContentBatchUpsertSchema,
) {}

export const WorkspaceContentBatchUpsertResponseSchema = z.object({
  workspaceId: z.string(),
  processedCount: z.number().int().nonnegative(),
  revisionCreatedCount: z.number().int().nonnegative(),
});

const WorkspaceContentDeleteDocumentSchema = z.object({
  documentId: DocumentIdSchema,
});

export const WorkspaceContentBatchDeleteSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  documents: z.array(WorkspaceContentDeleteDocumentSchema).min(1).max(500).refine(
    (docs) => new Set(docs.map((d) => d.documentId)).size === docs.length,
    { message: 'Duplicate documentId in batch' },
  ),
});

export class WorkspaceContentBatchDeleteDto extends createZodDto(
  WorkspaceContentBatchDeleteSchema,
) {}

export const WorkspaceContentBatchDeleteResponseSchema = z.object({
  workspaceId: z.string(),
  processedCount: z.number().int().nonnegative(),
  deletedCount: z.number().int().nonnegative(),
});

export type WorkspaceContentBatchUpsertInput = z.infer<
  typeof WorkspaceContentBatchUpsertSchema
>;
export type WorkspaceContentDocumentInput = z.infer<
  typeof WorkspaceContentDocumentSchema
>;
export type WorkspaceContentBatchUpsertResponseDto = z.infer<
  typeof WorkspaceContentBatchUpsertResponseSchema
>;
export type WorkspaceContentBatchDeleteInput = z.infer<
  typeof WorkspaceContentBatchDeleteSchema
>;
export type WorkspaceContentBatchDeleteResponseDto = z.infer<
  typeof WorkspaceContentBatchDeleteResponseSchema
>;
