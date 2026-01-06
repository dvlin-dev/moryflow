/**
 * Cloud Sync IPC 类型定义
 * 定义 renderer 与 main 进程之间通信的类型
 */

// ── 复用 main 进程类型 ─────────────────────────────────────

export type {
  CloudSyncSettings,
  VaultBinding,
  SyncStatusSnapshot,
  SyncEngineStatus,
  // Phase 4: 同步活动追踪类型
  SyncActivity,
  SyncActivityStatus,
  SyncDirection,
  PendingFile,
  SyncStatusDetail,
} from '../../main/cloud-sync/const.js'

// ── IPC 专用类型 ────────────────────────────────────────────

/** 云端 Vault 信息（精简版，用于列表展示） */
export interface CloudVault {
  id: string
  name: string
  fileCount?: number
  deviceCount?: number
}

/** 用量信息 */
export interface CloudUsageInfo {
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

/** 语义搜索结果 */
export interface SemanticSearchResult {
  fileId: string
  score: number
  title: string
  /** 本地文件路径（如果能找到） */
  localPath?: string
}

/** 同步状态变更事件 */
export interface CloudSyncStatusEvent {
  status: import('../../main/cloud-sync/const.js').SyncStatusSnapshot
}

/** 绑定 Vault 输入参数 */
export interface BindVaultInput {
  localPath: string
  /** 已有的 vaultId（绑定已存在的 vault） */
  vaultId?: string
  /** 新建 vault 时的名称 */
  vaultName?: string
}

/** 搜索输入参数 */
export interface SearchInput {
  query: string
  topK?: number
  vaultId?: string
}

// ── 绑定冲突相关类型 ─────────────────────────────────────────

/** 用户选择：同步到当前账号 or 保持离线 */
export type BindingConflictChoice = 'sync_to_current' | 'stay_offline'

/** 绑定冲突请求（Main -> Renderer） */
export interface BindingConflictRequest {
  requestId: string
  vaultPath: string
  vaultName: string
  boundUserId: string
}

/** 绑定冲突响应（Renderer -> Main） */
export interface BindingConflictResponse {
  requestId: string
  choice: BindingConflictChoice
}
