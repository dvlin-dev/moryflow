/**
 * [DEFINES]: Cloud Sync API 类型定义
 * [USED_BY]: apps/pc (cloud-sync), apps/mobile (cloud-sync)
 * [POS]: 与后端 DTO 保持一致的类型定义
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新 apps/server 对应的 DTO
 */

import type { VectorClock } from '../file-index/types'

// ── Vault API ──────────────────────────────────────────────

export interface VaultDto {
  id: string
  name: string
  createdAt: string // ISO date string
  fileCount?: number
  deviceCount?: number
}

export interface VaultDeviceDto {
  id: string
  deviceId: string
  deviceName: string
  lastSyncAt: string | null
}

export interface VaultListDto {
  vaults: VaultDto[]
}

// ── Sync API ───────────────────────────────────────────────

export interface LocalFileDto {
  fileId: string
  path: string
  title: string
  size: number
  contentHash: string
  /** 向量时钟：记录每个设备的修改次数 */
  vectorClock: VectorClock
}

export type SyncAction = 'upload' | 'download' | 'delete' | 'conflict'

export interface SyncActionDto {
  fileId: string
  path: string
  action: SyncAction
  /** 主 URL：upload/download 使用；conflict 时为下载云端版本的 URL */
  url?: string
  /** 上传 URL：仅 conflict 操作时使用，用于上传本地版本覆盖云端 */
  uploadUrl?: string
  /** 冲突副本路径 */
  conflictRename?: string
  /** 冲突副本的 fileId（服务端生成） */
  conflictCopyId?: string
  /** 冲突副本的上传 URL */
  conflictCopyUploadUrl?: string
  size?: number
  /** 目标文件的 contentHash */
  contentHash?: string
  /** 远端当前的向量时钟 */
  remoteVectorClock?: VectorClock
}

export interface SyncDiffRequest {
  vaultId: string
  deviceId: string
  localFiles: LocalFileDto[]
}

export interface SyncDiffResponse {
  actions: SyncActionDto[]
}

export interface CompletedFileDto {
  fileId: string
  action: SyncAction
  path: string
  title: string
  size: number
  contentHash: string
  /** 向量时钟 */
  vectorClock: VectorClock
  /** 期望的 hash（用于乐观锁校验） */
  expectedHash?: string
}

export interface SyncCommitRequest {
  vaultId: string
  deviceId: string
  completed: CompletedFileDto[]
  deleted: string[]
  /** 是否启用向量化（从客户端设置传入） */
  vectorizeEnabled?: boolean
}

export interface ConflictFileDto {
  fileId: string
  path: string
  expectedHash: string
  currentHash: string
}

export interface SyncCommitResponse {
  success: boolean
  syncedAt: string
  conflicts?: ConflictFileDto[]
}

// ── Vectorize API ──────────────────────────────────────────

export interface VectorizeFileRequest {
  fileId: string
  vaultId: string
  fileName: string
  content: string
}

export interface VectorizeResponse {
  queued: boolean
  fileId: string
}

export type VectorizeStatus = 'vectorized' | 'pending' | 'processing' | 'failed' | 'not_found'

export interface VectorizeStatusResponse {
  status: VectorizeStatus
  vectorizedAt?: string
  error?: string
}

// ── Search API ─────────────────────────────────────────────

export interface SearchRequest {
  query: string
  topK?: number
  vaultId?: string
}

export interface SearchResultItem {
  fileId: string
  score: number
  title: string
}

export interface SearchResponse {
  results: SearchResultItem[]
  count: number
}

// ── Usage API ──────────────────────────────────────────────

export interface UsageResponse {
  storage: {
    used: number
    limit: number
    percentage: number
  }
  vectorized: {
    count: number
    limit: number
    percentage: number
  }
  fileLimit: {
    maxFileSize: number
  }
  plan: string
}
