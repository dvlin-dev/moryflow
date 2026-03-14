/**
 * Cloud Sync - 类型定义和常量
 * 单一职责：定义 PC 端特有的类型、常量和默认值
 */

import { z } from 'zod';

// ── 云同步设置（IPC 对外返回）────────────────────────────────

export const CloudSyncSettingsSchema = z.object({
  syncEnabled: z.boolean(),
  deviceId: z.string().uuid(),
  deviceName: z.string().min(1).max(100),
});

export type CloudSyncSettings = z.infer<typeof CloudSyncSettingsSchema>;

// ── Vault 绑定信息（PC 端持久化）────────────────────────────

export interface VaultBinding {
  localPath: string;
  vaultId: string;
  vaultName: string;
  boundAt: number;
  /** 当前 profile 对应的用户 ID */
  userId: string;
}

// ── 同步状态（内存中，不持久化）─────────────────────────────

export type SyncEngineStatus = 'idle' | 'syncing' | 'offline' | 'disabled' | 'needs_recovery';

export interface SyncConflictCopyNoticeItem {
  fileId: string;
  path: string;
}

export interface SyncConflictCopyNotice {
  kind: 'conflict_copy_created';
  createdAt: number;
  items: SyncConflictCopyNoticeItem[];
}

export type SyncNotice = SyncConflictCopyNotice;

export interface SyncStatusSnapshot {
  engineStatus: SyncEngineStatus;
  vaultPath: string | null;
  vaultId: string | null;
  pendingCount: number;
  lastSyncAt: number | null;
  error?: string;
  notice?: SyncNotice;
}

// ── 同步活动追踪（Phase 4 高级功能）─────────────────────────

/** 同步活动状态 */
export type SyncActivityStatus = 'pending' | 'syncing' | 'completed' | 'failed';

/** 同步方向 */
export type SyncDirection = 'upload' | 'download' | 'delete';

/** 单个文件的同步活动 */
export interface SyncActivity {
  /** 文件 ID */
  fileId: string;
  /** 文件名（不含路径） */
  fileName: string;
  /** 相对路径（用于显示文件夹层级） */
  relativePath: string;
  /** 同步方向 */
  direction: SyncDirection;
  /** 同步状态 */
  status: SyncActivityStatus;
  /** 文件大小（字节） */
  size?: number;
  /** 完成时间（仅 completed/failed 状态有值） */
  completedAt?: number;
  /** 进度百分比（0-100，仅 syncing 状态有值） */
  progress?: number;
  /** 错误信息（仅 failed 状态有值） */
  error?: string;
}

/** 待同步文件简要信息 */
export interface PendingFile {
  fileName: string;
  relativePath: string;
  direction: SyncDirection;
}

/** 同步状态详情（用于 HoverCard 高级显示） */
export interface SyncStatusDetail {
  /** 引擎状态 */
  engineStatus: SyncEngineStatus;
  /** 总体进度（同步中时） */
  overallProgress?: {
    completed: number;
    total: number;
    bytesTransferred?: number;
    bytesTotal?: number;
  };
  /** 最近完成的活动（最多显示 5 条） */
  recentActivities: SyncActivity[];
  /** 当前正在同步的文件 */
  currentActivity?: SyncActivity;
  /** 待同步文件列表 */
  pendingFiles: PendingFile[];
  /** 上次同步时间 */
  lastSyncAt: number | null;
  /** 错误信息 */
  error?: string;
  /** 最近一次需要展示给用户的同步提示 */
  notice?: SyncNotice;
}

/** 同步防抖延迟 (ms) */
export const SYNC_DEBOUNCE_DELAY = 300;
