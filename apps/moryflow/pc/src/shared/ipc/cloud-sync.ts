/**
 * Cloud Sync IPC 类型定义
 * 定义 renderer 与 main 进程之间通信的类型
 */

import type {
  SearchRequest,
  SearchResultItem,
  UsageResponse,
  VaultDto,
} from '@moryflow/api/cloud-sync';

// ── 复用 main 进程类型 ─────────────────────────────────────

export type {
  CloudSyncSettings,
  VaultBinding,
  SyncStatusSnapshot,
  SyncEngineStatus,
  SyncNotice,
  // Phase 4: 同步活动追踪类型
  SyncActivity,
  SyncActivityStatus,
  SyncDirection,
  PendingFile,
  SyncStatusDetail,
} from '../../main/cloud-sync/const.js';

// ── IPC 专用类型 ────────────────────────────────────────────

/** 云端 Vault 信息（精简版，用于列表展示） */
export type CloudVault = Pick<VaultDto, 'id' | 'name' | 'fileCount' | 'deviceCount'>;

/** 用量信息 */
export type CloudUsageInfo = UsageResponse;

/** 语义搜索结果 */
export type SemanticSearchResult = SearchResultItem & {
  /** 本地文件路径（如果能找到） */
  localPath?: string;
};

/** 同步状态变更事件 */
export interface CloudSyncStatusEvent {
  status: import('../../main/cloud-sync/const.js').SyncStatusSnapshot;
}

/** 绑定 Vault 输入参数 */
export interface BindVaultInput {
  localPath: string;
  /** 已有的 vaultId（绑定已存在的 vault） */
  vaultId?: string;
  /** 新建 vault 时的名称 */
  vaultName?: string;
}

/** 搜索输入参数 */
export type SearchInput = SearchRequest;
