/**
 * [DEFINES]: Cloud Sync 常量与类型
 * [USED_BY]: cloud-sync 模块内部
 * [POS]: Mobile 端云同步常量定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { Platform } from 'react-native';
import { Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';

// ── 同步配置 ────────────────────────────────────────────────

/** 同步防抖延迟（ms） */
export const SYNC_DEBOUNCE_DELAY = 3000;

/** 大文件阈值（10MB） - 超过此大小的文件将被跳过 */
export const MAX_SYNC_FILE_SIZE = 10 * 1024 * 1024;

/** 向量化最大文件大小（100KB） */
export const VECTORIZE_MAX_SIZE = 100 * 1024;

/** 网络请求超时时间（ms） */
export const FETCH_TIMEOUT = 30000;

// ── 存储 Key ────────────────────────────────────────────────

export const STORE_KEYS = {
  SETTINGS: 'cloud_sync_settings',
  BINDINGS: 'cloud_sync_bindings',
} as const;

// ── 类型定义 ────────────────────────────────────────────────

/** 同步引擎状态 */
export type SyncEngineStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'disabled';

/** 同步状态快照 */
export interface SyncStatusSnapshot {
  status: SyncEngineStatus;
  vaultId: string | null;
  vaultName: string | null;
  lastSyncAt: number | null;
  error: string | null;
  pendingCount: number;
}

/** 云同步设置 */
export interface CloudSyncSettings {
  /** 是否启用同步 */
  syncEnabled: boolean;
  /** 是否启用向量化 */
  vectorizeEnabled: boolean;
  /** 设备 ID */
  deviceId: string;
  /** 设备名称 */
  deviceName: string;
}

/** Vault 绑定关系 */
export interface VaultBinding {
  /** 本地 Vault 路径 */
  localPath: string;
  /** 云端 Vault ID */
  vaultId: string;
  /** Vault 名称 */
  vaultName: string;
  /** 绑定时间戳 */
  boundAt: number;
  /** 绑定时的用户 ID，用于账号切换检测 */
  userId: string;
}

// ── 工具函数 ────────────────────────────────────────────────

/** 从文件路径提取标题（文件名不含扩展名） */
export function extractTitle(filePath: string): string {
  const basename = Paths.basename(filePath);
  const extname = Paths.extname(filePath);
  return extname ? basename.slice(0, -extname.length) : basename;
}

/** 生成唯一设备 ID（纯 UUID 格式） */
export function generateDeviceId(): string {
  return randomUUID();
}

/** 获取设备名称 */
export function getDeviceName(): string {
  // 使用平台信息作为设备名称
  const osVersion = Platform.Version;
  return `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} (${Platform.OS} ${osVersion})`;
}

/** 创建默认设置 */
export function createDefaultSettings(): CloudSyncSettings {
  return {
    syncEnabled: true,
    vectorizeEnabled: true,
    deviceId: generateDeviceId(),
    deviceName: getDeviceName(),
  };
}

/** 格式化存储大小 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/** 格式化最后同步时间 */
export function formatLastSyncTime(lastSyncAt: number | null): string {
  if (!lastSyncAt) return '从未同步';
  const diff = Date.now() - lastSyncAt;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}
