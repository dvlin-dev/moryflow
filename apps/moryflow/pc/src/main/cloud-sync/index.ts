/**
 * [PROVIDES]: cloudSyncEngine, cloudSyncApi - 云同步模块统一导出
 * [DEPENDS]: sync-engine/, api/, auto-binding.js - 内部子模块
 * [POS]: PC 端云同步核心入口，对外暴露同步引擎与 API 客户端
 * [DOC]: docs/design/moryflow/features/cloud-sync-unified-implementation.md
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// ── 引擎 ────────────────────────────────────────────────────

export { cloudSyncEngine } from './sync-engine/index.js';

// ── 自动绑定 ─────────────────────────────────────────────────

export { tryAutoBinding, resetAutoBindingState, setRetryCallback } from './auto-binding.js';

// ── API ─────────────────────────────────────────────────────

export { cloudSyncApi, CloudSyncApiError } from './api/client.js';
export type * from './api/types.js';

// ── 类型和常量 ──────────────────────────────────────────────

export type {
  CloudSyncSettings,
  VaultBinding,
  SyncStatusSnapshot,
  SyncEngineStatus,
} from './const.js';

export {
  SYNC_DEBOUNCE_DELAY,
} from './const.js';

// ── 日志和错误处理 ──────────────────────────────────────────

export { logger, createLogger } from './logger.js';
export { CloudSyncError, CloudSyncErrorCode, isNetworkError, wrapError } from './errors.js';
