/**
 * [DEFINES]: 云同步系统共享类型定义
 * [USED_BY]: PC 客户端、Mobile 客户端、服务端
 * [POS]: 定义 FileEntry、FileIndex、同步状态等核心类型
 */

import type { VectorClock } from './vector-clock.js'

// ── 文件索引类型 ────────────────────────────────────────────

/**
 * 文件条目（持久化到 file-index.json）
 */
export interface FileEntry {
  /** 文件唯一标识 (UUID) */
  id: string
  /** 相对路径 */
  path: string
  /** 创建时间戳（首次分配 fileId 的时间） */
  createdAt: number

  /** 当前向量时钟状态 */
  vectorClock: VectorClock

  /** 上次同步成功时的内容哈希，null 表示从未同步 */
  lastSyncedHash: string | null
  /** 上次同步成功时的时钟状态 */
  lastSyncedClock: VectorClock
}

/**
 * 文件索引结构（v2，使用向量时钟）
 */
export interface FileIndex {
  /** 版本号，v2 表示向量时钟版本 */
  version: 2
  /** 设备唯一标识 */
  deviceId: string
  /** 文件条目列表 */
  files: FileEntry[]
}

/**
 * 旧版文件索引结构（用于迁移）
 */
export interface LegacyFileIndex {
  files: Array<{
    id: string
    path: string
    createdAt: number
  }>
}

// ── 同步状态类型 ────────────────────────────────────────────

/**
 * 待提交的状态变更（暂存，不立即应用）
 */
export interface PendingChange {
  type: 'new' | 'modified' | 'deleted'
  fileId: string
  path: string
  vectorClock: VectorClock
  contentHash: string
}

/**
 * 下载的文件信息（用于后续更新 FileIndex）
 */
export interface DownloadedEntry {
  fileId: string
  path: string
  vectorClock: VectorClock
  contentHash: string
}

/**
 * 冲突处理信息（用于后续更新 FileIndex）
 */
export interface ConflictEntry {
  /** 原始文件信息 */
  originalFileId: string
  originalPath: string
  mergedClock: VectorClock
  contentHash: string
  /** 冲突副本信息 */
  conflictCopyId: string
  conflictCopyPath: string
  conflictCopyClock: VectorClock
  conflictCopyHash: string
}

/**
 * 执行结果（暂存，不直接修改 FileIndex）
 */
export interface ExecuteResult {
  /** 已完成的文件操作 */
  completed: CompletedFile[]
  /** 已删除的文件 ID 列表 */
  deleted: string[]
  /** 下载的文件信息 */
  downloadedEntries: DownloadedEntry[]
  /** 冲突处理信息 */
  conflictEntries: ConflictEntry[]
  /** 执行错误 */
  errors: Array<{ action: SyncActionDto; error: Error }>
}

// ── 同步操作类型 ────────────────────────────────────────────

export type SyncAction = 'upload' | 'download' | 'delete' | 'conflict'

/**
 * 同步操作指令
 */
export interface SyncActionDto {
  fileId: string
  path: string
  action: SyncAction

  /** upload 使用的预签名 URL */
  uploadUrl?: string

  /** download 使用的预签名 URL */
  downloadUrl?: string

  /** conflict 时的冲突副本路径 */
  conflictRename?: string

  size?: number
  contentHash?: string
  remoteVectorClock?: VectorClock
}

/**
 * 本地文件 DTO（发送给服务端）
 */
export interface LocalFileDto {
  fileId: string
  path: string
  title: string
  size: number
  contentHash: string
  vectorClock: VectorClock
}

/**
 * 已完成的文件操作
 */
export interface CompletedFile {
  fileId: string
  action: SyncAction
  path: string
  title: string
  size: number
  contentHash: string
  vectorClock: VectorClock
  /** 上传操作时用于乐观锁校验 */
  expectedHash?: string
}

/**
 * 冲突文件 DTO（乐观锁冲突时返回）
 */
export interface ConflictFileDto {
  fileId: string
  path: string
  expectedHash: string
  currentHash: string
}

// ── 同步请求/响应类型 ────────────────────────────────────────

export interface SyncDiffRequest {
  vaultId: string
  deviceId: string
  localFiles: LocalFileDto[]
}

export interface SyncDiffResponse {
  actions: SyncActionDto[]
}

export interface SyncCommitRequest {
  vaultId: string
  deviceId: string
  completed: CompletedFile[]
  deleted: string[]
  vectorizeEnabled?: boolean
}

export interface SyncCommitResponse {
  success: boolean
  syncedAt: string
  conflicts?: ConflictFileDto[]
}

// ── 同步结果类型 ────────────────────────────────────────────

export interface SyncResult {
  uploaded: number
  downloaded: number
  conflicts: number
}
