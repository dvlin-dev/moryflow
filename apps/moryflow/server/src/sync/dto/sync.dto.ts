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
import { normalizeSyncPath, isSafeRelativeSyncPath } from '@moryflow/sync';

// 重导出 VectorClock 类型供其他模块使用
export type { VectorClock } from '@moryflow/sync';

const SafeRelativePathSchema = z
  .string()
  .min(1, 'path is required')
  .transform((value) => normalizeSyncPath(value))
  .refine((value) => isSafeRelativeSyncPath(value), {
    message: 'path must be a safe relative path',
  });

// ==================== 向量时钟 Schema ====================

/**
 * 向量时钟运行时验证 Schema
 */
export const VectorClockSchema = z.record(z.string(), z.number());

// ==================== Request Schemas ====================

/**
 * 本地文件信息
 */
export const LocalFileSchema = z
  .object({
    fileId: z.string().uuid('fileId must be a valid UUID'),
    path: SafeRelativePathSchema,
    title: z.string().min(1, 'title is required'),
    size: z.number().min(0, 'size must be non-negative'),
    contentHash: z.string(), // 空字符串表示删除
    vectorClock: VectorClockSchema,
  })
  .strict();

export type LocalFileDto = z.infer<typeof LocalFileSchema>;

/**
 * 同步差异请求
 */
export const SyncDiffRequestSchema = z
  .object({
    vaultId: z.string().uuid('vaultId must be a valid UUID'),
    deviceId: z.string().uuid('deviceId must be a valid UUID'),
    localFiles: z.array(LocalFileSchema),
  })
  .strict();

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

export const SyncActionReceiptSchema = z
  .object({
    actionId: z.string().uuid('actionId must be a valid UUID'),
    receiptToken: z.string().min(1, 'receiptToken is required'),
  })
  .strict();

export type SyncActionReceiptDto = z.infer<typeof SyncActionReceiptSchema>;

/**
 * 提交同步请求
 */
export const SyncCommitRequestSchema = z
  .object({
    vaultId: z.string().uuid('vaultId must be a valid UUID'),
    deviceId: z.string().uuid('deviceId must be a valid UUID'),
    receipts: z.array(SyncActionReceiptSchema),
  })
  .superRefine(({ receipts }, ctx) => {
    const seen = new Set<string>();

    receipts.forEach((receipt, index) => {
      if (seen.has(receipt.actionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['receipts', index, 'actionId'],
          message: 'actionId must be unique within a commit request',
        });
        return;
      }

      seen.add(receipt.actionId);
    });
  })
  .strict();

export class SyncCommitRequestDto extends createZodDto(
  SyncCommitRequestSchema,
) {}

export const SyncCleanupOrphanObjectSchema = z
  .object({
    fileId: z.string().uuid('fileId must be a valid UUID'),
    storageRevision: z.string().uuid('storageRevision must be a valid UUID'),
    contentHash: z.string().min(1, 'contentHash is required'),
  })
  .strict();

export type SyncCleanupOrphanObjectDto = z.infer<
  typeof SyncCleanupOrphanObjectSchema
>;

export const SyncCleanupOrphansRequestSchema = z
  .object({
    vaultId: z.string().uuid('vaultId must be a valid UUID'),
    objects: z.array(SyncCleanupOrphanObjectSchema),
  })
  .strict();

export class SyncCleanupOrphansRequestDto extends createZodDto(
  SyncCleanupOrphansRequestSchema,
) {}

// ==================== Response Schemas ====================

/**
 * 同步操作项
 */
export const SyncActionSchema = z.object({
  actionId: z.string().uuid('actionId must be a valid UUID'),
  receiptToken: z.string().min(1, 'receiptToken is required'),
  fileId: z.string(),
  path: SafeRelativePathSchema,
  action: SyncActionTypeSchema,
  title: z.string().optional(),
  url: z.string().optional(),
  uploadUrl: z.string().optional(),
  conflictRename: SafeRelativePathSchema.optional(),
  conflictCopyId: z.string().optional(),
  conflictCopyUploadUrl: z.string().optional(),
  storageRevision: z.string().uuid().optional(),
  remoteStorageRevision: z.string().uuid().optional(),
  conflictCopyStorageRevision: z.string().uuid().optional(),
  size: z.number().optional(),
  contentHash: z.string().optional(),
  uploadContentHash: z.string().optional(),
  uploadSize: z.number().optional(),
  remoteVectorClock: VectorClockSchema.optional(),
});

export type SyncActionDto = z.infer<typeof SyncActionSchema>;
export type SyncActionSeedDto = Omit<
  SyncActionDto,
  'actionId' | 'receiptToken'
>;

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

export const SyncCleanupOrphansResponseSchema = z.object({
  accepted: z.literal(true),
  deletedCount: z.number().int().min(0),
  retryCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
});

export type SyncCleanupOrphansResponseDto = z.infer<
  typeof SyncCleanupOrphansResponseSchema
>;

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
