/**
 * @aiget/sync
 *
 * [PROVIDES]: 云同步系统共享工具包
 * [DEPENDS]: zod
 * [POS]: 供 PC 客户端、Mobile 客户端、服务端共用
 *
 * 包含：
 * - 向量时钟工具（vector-clock）
 * - 共享类型定义（types）
 * - Zod schemas（dto）
 * - 哈希计算工具（hash）
 * - 错误类型（errors）
 */

// 向量时钟
export {
  type VectorClock,
  type ClockRelation,
  compareVectorClocks,
  mergeVectorClocks,
  incrementClock,
  createEmptyClock,
  isEmptyClock,
  cloneClock,
} from './vector-clock.js'

// 类型定义
export type {
  FileEntry,
  FileIndex,
  LegacyFileIndex,
  PendingChange,
  DownloadedEntry,
  ConflictEntry,
  ExecuteResult,
  SyncAction,
  SyncActionDto,
  LocalFileDto,
  CompletedFile,
  ConflictFileDto,
  SyncDiffRequest,
  SyncDiffResponse,
  SyncCommitRequest,
  SyncCommitResponse,
  SyncResult,
} from './types.js'

// Zod schemas
export {
  VectorClockSchema,
  SyncActionSchema,
  LocalFileSchema,
  CompletedFileSchema,
  SyncActionDtoSchema,
  ConflictFileDtoSchema,
  SyncDiffRequestSchema,
  SyncDiffResponseSchema,
  SyncCommitRequestSchema,
  SyncCommitResponseSchema,
  type VectorClockDto,
  type LocalFileDtoZ,
  type CompletedFileDtoZ,
  type SyncActionDtoZ,
  type ConflictFileDtoZ,
  type SyncDiffRequestZ,
  type SyncDiffResponseZ,
  type SyncCommitRequestZ,
  type SyncCommitResponseZ,
} from './dto.js'

// 哈希工具
export {
  computeHashAsync,
  computeHashFromBytes,
  extractTitle,
  isMarkdownFile,
} from './hash.js'

// 错误类型
export {
  SyncError,
  type SyncErrorCode,
  createNetworkError,
  createUploadError,
  createDownloadError,
  createQuotaError,
} from './errors.js'
