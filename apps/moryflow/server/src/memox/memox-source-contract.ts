import { z } from 'zod';

export const MORYFLOW_WORKSPACE_MARKDOWN_SOURCE_TYPE =
  'moryflow_workspace_markdown_v1' as const;

export const WorkspaceContentInlinePayloadSchema = z.object({
  mode: z.literal('inline_text'),
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  documentId: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  mimeType: z.string().min(1).optional(),
  contentHash: z.string().min(1),
  content: z.string(),
});

export const WorkspaceContentSyncObjectRefPayloadSchema = z.object({
  mode: z.literal('sync_object_ref'),
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  documentId: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  mimeType: z.string().min(1).optional(),
  contentHash: z.string().min(1),
  vaultId: z.string().min(1),
  fileId: z.string().min(1),
  storageRevision: z.string().min(1),
});

export const WorkspaceContentUpsertPayloadSchema = z.discriminatedUnion(
  'mode',
  [
    WorkspaceContentInlinePayloadSchema,
    WorkspaceContentSyncObjectRefPayloadSchema,
  ],
);

export const WorkspaceContentDeletePayloadSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  documentId: z.string().min(1),
});

export type WorkspaceContentInlinePayload = z.infer<
  typeof WorkspaceContentInlinePayloadSchema
>;
export type WorkspaceContentSyncObjectRefPayload = z.infer<
  typeof WorkspaceContentSyncObjectRefPayloadSchema
>;
export type WorkspaceContentUpsertPayload = z.infer<
  typeof WorkspaceContentUpsertPayloadSchema
>;
export type WorkspaceContentDeletePayload = z.infer<
  typeof WorkspaceContentDeletePayloadSchema
>;
