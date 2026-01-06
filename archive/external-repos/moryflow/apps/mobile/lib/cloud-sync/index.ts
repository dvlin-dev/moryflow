/**
 * [PROVIDES]: cloudSyncEngine, useSyncEngineStore - Cloud Sync 模块入口
 * [DEPENDS]: api-client, store, sync-engine
 * [POS]: Mobile 端云同步模块对外接口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// 核心引擎
export { cloudSyncEngine, useSyncEngineStore } from './sync-engine'

// API 客户端（供外部直接调用特定 API）
export { cloudSyncApi, CloudSyncApiError } from './api-client'

// Hooks
export { useCloudSync, useCloudSyncInit } from './hooks'

// 类型和常量
export type {
  SyncEngineStatus,
  SyncStatusSnapshot,
  CloudSyncSettings,
  VaultBinding,
} from './const'

// 工具函数
export { formatStorageSize, formatLastSyncTime } from './const'
