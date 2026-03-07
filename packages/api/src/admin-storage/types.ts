/**
 * [DEFINES]: Admin storage DTO and query types
 * [USED_BY]: apps/moryflow/admin storage pages and hooks
 * [POS]: Moryflow Admin storage shared contract
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新 apps/moryflow/server/src/admin-storage/dto/admin-storage.dto.ts
 */

export interface StorageStats {
  storage: {
    totalUsed: number;
    userCount: number;
    vaultCount: number;
    fileCount: number;
    deviceCount: number;
  };
}

export interface VaultListItem {
  id: string;
  name: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  fileCount: number;
  totalSize: number;
  deviceCount: number;
  createdAt: string;
}

export interface VaultListResponse {
  vaults: VaultListItem[];
  total: number;
}

export interface VaultDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  lastSyncAt: string | null;
}

export interface VaultFile {
  id: string;
  path: string;
  title: string;
  size: number;
  updatedAt: string;
}

export interface VaultDetailResponse {
  vault: {
    id: string;
    name: string;
    userId: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      subscriptionTier: string;
    };
  };
  stats: {
    fileCount: number;
    totalSize: number;
    deviceCount: number;
  };
  devices: VaultDevice[];
  recentFiles: VaultFile[];
}

export interface UserStorageListItem {
  userId: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  storageUsed: number;
  storageLimit: number;
  vaultCount: number;
}

export interface UserStorageListResponse {
  users: UserStorageListItem[];
  total: number;
}

export interface UserVault {
  id: string;
  name: string;
  fileCount: number;
  totalSize: number;
  deviceCount: number;
  createdAt: string;
}

export interface UserStorageDetailResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    subscriptionTier: string;
  };
  usage: {
    storageUsed: number;
    storageLimit: number;
  };
  vaults: UserVault[];
}

export interface VaultListParams {
  search?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface UserStorageListParams {
  search?: string;
  limit?: number;
  offset?: number;
}
