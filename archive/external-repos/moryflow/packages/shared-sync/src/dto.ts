/**
 * [DEFINES]: Zod schemas 用于 API 请求/响应验证
 * [USED_BY]: 服务端 Controller 层、客户端请求构建
 * [POS]: 提供类型安全的数据验证
 */

import { z } from 'zod'

// ── 基础 Schemas ────────────────────────────────────────────

export const VectorClockSchema = z.record(z.string(), z.number())

export const SyncActionSchema = z.enum(['upload', 'download', 'delete', 'conflict'])

// ── 文件相关 Schemas ────────────────────────────────────────

export const LocalFileSchema = z.object({
  fileId: z.string().uuid(),
  path: z.string().min(1),
  title: z.string().min(1),
  size: z.number().min(0),
  contentHash: z.string(),
  vectorClock: VectorClockSchema,
})

export const CompletedFileSchema = z.object({
  fileId: z.string().uuid(),
  action: SyncActionSchema,
  path: z.string().min(1),
  title: z.string().min(1),
  size: z.number().min(0),
  contentHash: z.string(),
  vectorClock: VectorClockSchema,
  expectedHash: z.string().optional(),
})

export const SyncActionDtoSchema = z.object({
  fileId: z.string().uuid(),
  path: z.string().min(1),
  action: SyncActionSchema,
  uploadUrl: z.string().url().optional(),
  downloadUrl: z.string().url().optional(),
  conflictRename: z.string().optional(),
  size: z.number().min(0).optional(),
  contentHash: z.string().optional(),
  remoteVectorClock: VectorClockSchema.optional(),
})

export const ConflictFileDtoSchema = z.object({
  fileId: z.string().uuid(),
  path: z.string().min(1),
  expectedHash: z.string(),
  currentHash: z.string(),
})

// ── 同步请求 Schemas ────────────────────────────────────────

export const SyncDiffRequestSchema = z.object({
  vaultId: z.string().uuid(),
  deviceId: z.string().min(1),
  localFiles: z.array(LocalFileSchema),
})

export const SyncDiffResponseSchema = z.object({
  actions: z.array(SyncActionDtoSchema),
})

export const SyncCommitRequestSchema = z.object({
  vaultId: z.string().uuid(),
  deviceId: z.string().min(1),
  completed: z.array(CompletedFileSchema),
  deleted: z.array(z.string().uuid()),
  vectorizeEnabled: z.boolean().optional().default(false),
})

export const SyncCommitResponseSchema = z.object({
  success: z.boolean(),
  syncedAt: z.string(),
  conflicts: z.array(ConflictFileDtoSchema).optional(),
})

// ── 类型导出（从 schema 推断）────────────────────────────────

export type VectorClockDto = z.infer<typeof VectorClockSchema>
export type LocalFileDtoZ = z.infer<typeof LocalFileSchema>
export type CompletedFileDtoZ = z.infer<typeof CompletedFileSchema>
export type SyncActionDtoZ = z.infer<typeof SyncActionDtoSchema>
export type ConflictFileDtoZ = z.infer<typeof ConflictFileDtoSchema>
export type SyncDiffRequestZ = z.infer<typeof SyncDiffRequestSchema>
export type SyncDiffResponseZ = z.infer<typeof SyncDiffResponseSchema>
export type SyncCommitRequestZ = z.infer<typeof SyncCommitRequestSchema>
export type SyncCommitResponseZ = z.infer<typeof SyncCommitResponseSchema>
