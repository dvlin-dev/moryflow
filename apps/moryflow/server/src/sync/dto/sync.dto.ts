/**
 * Sync DTOs
 * 使用 Zod 进行运行时验证
 *
 * [DEFINES]: Sync request/response schemas
 * [USED_BY]: SyncController, SyncService
 * [PROTOCOL]: 向量时钟版本，替代时间戳方案
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// 重导出 VectorClock 类型供其他模块使用
export type { VectorClock } from '@moryflow/sync';

// ==================== 向量时钟 Schema ====================

/**
 * 向量时钟运行时验证 Schema
 */
export const VectorClockSchema = z.record(z.string(), z.number());

// ==================== Request Schemas ====================

/**
 * 本地文件信息
 */
export const LocalFileSchema = z.object({
  fileId: z.string().uuid('fileId must be a valid UUID'),
  path: z.string().min(1, 'path is required'),
  title: z.string().min(1, 'title is required'),
  size: z.number().min(0, 'size must be non-negative'),
  contentHash: z.string(), // 空字符串表示删除
  vectorClock: VectorClockSchema,
});

export type LocalFileDto = z.infer<typeof LocalFileSchema>;

/**
 * 同步差异请求
 */
export const SyncDiffRequestSchema = z.object({
  vaultId: z.string().uuid('vaultId must be a valid UUID'),
  deviceId: z.string().uuid('deviceId must be a valid UUID'),
  localFiles: z.array(LocalFileSchema),
});

export class SyncDiffRequestDto extends createZodDto(SyncDiffRequestSchema) {}

/**
 * 同步操作类型
 */
export const SyncActionTypeSchema = z.enum([
  'upload',
  'download',
  'delete',
  'conflict',
]);
export type SyncAction = z.infer<typeof SyncActionTypeSchema>;

/**
 * 已完成同步的文件信息
 */
export const CompletedFileSchema = z.object({
  fileId: z.string().uuid('fileId must be a valid UUID'),
  action: SyncActionTypeSchema,
  path: z.string().min(1, 'path is required'),
  title: z.string().min(1, 'title is required'),
  size: z.number().min(0, 'size must be non-negative'),
  contentHash: z.string().min(1, 'contentHash is required'),
  vectorClock: VectorClockSchema,
  expectedHash: z.string().optional(),
});

export type CompletedFileDto = z.infer<typeof CompletedFileSchema>;

/**
 * 提交同步请求
 */
export const SyncCommitRequestSchema = z.object({
  vaultId: z.string().uuid('vaultId must be a valid UUID'),
  deviceId: z.string().uuid('deviceId must be a valid UUID'),
  completed: z.array(CompletedFileSchema),
  deleted: z.array(z.string()),
  vectorizeEnabled: z.boolean().optional().default(false),
});

export class SyncCommitRequestDto extends createZodDto(
  SyncCommitRequestSchema,
) {}

// ==================== Response Schemas ====================

/**
 * 同步操作项
 */
export const SyncActionSchema = z.object({
  fileId: z.string(),
  path: z.string(),
  action: SyncActionTypeSchema,
  url: z.string().optional(),
  uploadUrl: z.string().optional(),
  conflictRename: z.string().optional(),
  conflictCopyId: z.string().optional(),
  conflictCopyUploadUrl: z.string().optional(),
  size: z.number().optional(),
  contentHash: z.string().optional(),
  remoteVectorClock: VectorClockSchema.optional(),
});

export type SyncActionDto = z.infer<typeof SyncActionSchema>;

/**
 * 同步差异响应
 */
export const SyncDiffResponseSchema = z.object({
  actions: z.array(SyncActionSchema),
});

export type SyncDiffResponseDto = z.infer<typeof SyncDiffResponseSchema>;

/**
 * 冲突文件信息
 */
export const ConflictFileSchema = z.object({
  fileId: z.string(),
  path: z.string(),
  expectedHash: z.string(),
  currentHash: z.string(),
});

export type ConflictFileDto = z.infer<typeof ConflictFileSchema>;

/**
 * 提交同步响应
 */
export const SyncCommitResponseSchema = z.object({
  success: z.boolean(),
  syncedAt: z.date(),
  conflicts: z.array(ConflictFileSchema).optional(),
});

export type SyncCommitResponseDto = z.infer<typeof SyncCommitResponseSchema>;

/**
 * 远程文件信息
 */
export const RemoteFileSchema = z.object({
  fileId: z.string(),
  path: z.string(),
  title: z.string(),
  size: z.number(),
  contentHash: z.string(),
  vectorClock: VectorClockSchema,
});

export type RemoteFileDto = z.infer<typeof RemoteFileSchema>;

/**
 * 分页元数据
 */
export const FileListPaginationSchema = z.object({
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

export type FileListPaginationDto = z.infer<typeof FileListPaginationSchema>;

/**
 * 文件列表响应（支持分页）
 */
export const FileListResponseSchema = z.object({
  files: z.array(RemoteFileSchema),
  pagination: FileListPaginationSchema,
});

export type FileListResponseDto = z.infer<typeof FileListResponseSchema>;
