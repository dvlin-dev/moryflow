/**
 * 多 Vault 存储管理
 * 支持多个 Vault 列表和活动 Vault 切换
 */

import Store from 'electron-store';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { VaultItem } from '../../shared/ipc.js';

// ── 类型定义 ────────────────────────────────────────────────

interface VaultStoreSchema {
  /** 所有已添加的 Vault */
  vaults: VaultItem[];
  /** 当前活动 Vault 的 ID */
  activeVaultId: string | null;
  /** 是否已从旧版本迁移 */
  migrated?: boolean;
}

// ── Store 实例 ────────────────────────────────────────────────

const e2eUserData = process.env['MORYFLOW_E2E_USER_DATA'];
const e2eStoreDir = e2eUserData ? path.join(e2eUserData, 'stores') : undefined;

const store = new Store<VaultStoreSchema>({
  name: 'vault-store',
  ...(e2eStoreDir ? { cwd: e2eStoreDir } : {}),
  defaults: {
    vaults: [],
    activeVaultId: null,
    migrated: false,
  },
});

// ── 读取操作 ────────────────────────────────────────────────

/** 获取所有 Vault */
export const getVaults = (): VaultItem[] => {
  return store.get('vaults') ?? [];
};

/** 根据 ID 获取 Vault */
export const getVaultById = (id: string): VaultItem | null => {
  const vaults = getVaults();
  return vaults.find((v) => v.id === id) ?? null;
};

/** 根据路径获取 Vault */
export const getVaultByPath = (vaultPath: string): VaultItem | null => {
  const vaults = getVaults();
  const normalizedPath = path.resolve(vaultPath);
  return vaults.find((v) => path.resolve(v.path) === normalizedPath) ?? null;
};

/** 获取当前活动 Vault ID */
export const getActiveVaultId = (): string | null => {
  return store.get('activeVaultId') ?? null;
};

/** 获取当前活动 Vault */
export const getActiveVault = (): VaultItem | null => {
  const activeId = getActiveVaultId();
  if (!activeId) return null;
  return getVaultById(activeId);
};

/** 检查是否已迁移 */
export const isMigrated = (): boolean => {
  return store.get('migrated') ?? false;
};

// ── 写入操作 ────────────────────────────────────────────────

/** 设置活动 Vault */
export const setActiveVaultId = (vaultId: string | null): void => {
  store.set('activeVaultId', vaultId);
};

/** 添加 Vault（打开/创建时调用） */
export const addVault = (vaultPath: string, name?: string): VaultItem => {
  // 检查是否已存在（复用 getVaultByPath 避免重复逻辑）
  const existing = getVaultByPath(vaultPath);
  if (existing) {
    // 已存在，直接设为活动并返回
    setActiveVaultId(existing.id);
    return existing;
  }

  // 创建新 Vault
  const normalizedPath = path.resolve(vaultPath);
  const newVault: VaultItem = {
    id: randomUUID(),
    path: normalizedPath,
    name: name || path.basename(normalizedPath),
    addedAt: Date.now(),
  };

  // 添加到列表并设为活动
  const vaults = getVaults();
  store.set('vaults', [...vaults, newVault]);
  setActiveVaultId(newVault.id);

  return newVault;
};

/** 移除 Vault（仅从列表移除，不删除文件） */
export const removeVault = (vaultId: string): void => {
  const vaults = getVaults();
  const filtered = vaults.filter((v) => v.id !== vaultId);
  store.set('vaults', filtered);

  // 如果移除的是当前活动 Vault，切换到其他或清空
  if (getActiveVaultId() === vaultId) {
    setActiveVaultId(filtered.length > 0 ? filtered[0].id : null);
  }
};

/** 更新 Vault 名称 */
export const updateVaultName = (vaultId: string, name: string): void => {
  const vaults = getVaults();
  const updated = vaults.map((v) => (v.id === vaultId ? { ...v, name } : v));
  store.set('vaults', updated);
};

/** 标记已迁移 */
export const setMigrated = (value: boolean): void => {
  store.set('migrated', value);
};

/** 批量设置 Vault 列表（用于迁移） */
export const setVaults = (vaults: VaultItem[]): void => {
  store.set('vaults', vaults);
};
