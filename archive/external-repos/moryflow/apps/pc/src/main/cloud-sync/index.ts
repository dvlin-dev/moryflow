/**
 * [PROVIDES]: cloudSyncEngine, cloudSyncApi, fileIndexManager - 云同步模块统一导出
 * [DEPENDS]: sync-engine/, api/, file-index/, store.js - 内部子模块
 * [POS]: PC 端云同步核心入口，对外暴露同步引擎、API 客户端、文件索引管理
 * [DOC]: docs/features/cloud-sync/tech.md
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// ── 引擎 ────────────────────────────────────────────────────

export { cloudSyncEngine } from './sync-engine/index.js'

// ── 自动绑定 ─────────────────────────────────────────────────

export { tryAutoBinding, resetAutoBindingState, setRetryCallback } from './auto-binding.js'

// ── API ─────────────────────────────────────────────────────

export { cloudSyncApi, CloudSyncApiError } from './api/client.js'
export type * from './api/types.js'

// ── fileIndex ───────────────────────────────────────────────

export { fileIndexManager } from './file-index/index.js'

// ── Store ───────────────────────────────────────────────────

export {
  readSettings,
  writeSettings,
  readBindings,
  readBinding,
  writeBinding,
  deleteBinding,
} from './store.js'

// ── 类型和常量 ──────────────────────────────────────────────

export type {
  CloudSyncSettings,
  CloudSyncStoreSchema,
  VaultBinding,
  SyncStatusSnapshot,
  SyncEngineStatus,
} from './const.js'

export {
  STORE_NAME,
  SYNC_DEBOUNCE_DELAY,
  VECTORIZE_DEBOUNCE_DELAY,
  VECTORIZE_MAX_SIZE,
  FILE_INDEX_STORE_PATH,
  createDefaultSettings,
} from './const.js'

// ── 日志和错误处理 ──────────────────────────────────────────

export { logger, createLogger } from './logger.js'
export {
  CloudSyncError,
  CloudSyncErrorCode,
  isNetworkError,
  wrapError,
} from './errors.js'
