/**
 * Cloud Sync - API 类型定义
 * 从共享包 re-export，保持向后兼容
 */

export type {
  // Vault API
  VaultDto,
  VaultDeviceDto,
  VaultListDto,

  // Sync API
  LocalFileDto,
  SyncAction,
  SyncActionDto,
  SyncDiffRequest,
  SyncDiffResponse,
  SyncActionReceiptDto,
  SyncCommitRequest,
  ConflictFileDto,
  SyncCommitResponse,
  SyncCleanupOrphanObjectDto,
  SyncCleanupOrphansRequest,
  SyncCleanupOrphansResponse,

  // Vectorize API
  VectorizeFileRequest,
  VectorizeResponse,
  VectorizeStatus,
  VectorizeStatusResponse,

  // Search API
  SearchRequest,
  SearchResultItem,
  SearchResponse,

  // Usage API
  UsageResponse,
} from '@moryflow/api/cloud-sync';
