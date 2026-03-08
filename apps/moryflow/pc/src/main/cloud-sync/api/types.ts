/**
 * Cloud Sync - API 类型定义
 * 从共享包 re-export，作为主进程 cloud-sync API 的单一类型出口
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

  // Search API
  SearchRequest,
  SearchResultItem,
  SearchResponse,

  // Usage API
  UsageResponse,
} from '@moryflow/api/cloud-sync';
