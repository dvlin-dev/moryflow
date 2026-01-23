/**
 * 云同步管理相关类型定义
 */

// ==================== 统计 ====================

/** 云同步整体统计 */
export interface StorageStats {
  storage: {
    /** 总存储使用量（字节） */
    totalUsed: number;
    /** 使用云同步的用户数 */
    userCount: number;
    /** Vault 总数 */
    vaultCount: number;
    /** 文件总数 */
    fileCount: number;
    /** 设备总数 */
    deviceCount: number;
  };
  vectorize: {
    /** 向量化文件总数 */
    totalCount: number;
    /** 使用向量化的用户数 */
    userCount: number;
  };
}

// ==================== Vault ====================

/** Vault 列表项 */
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

/** Vault 列表响应 */
export interface VaultListResponse {
  vaults: VaultListItem[];
  total: number;
}

/** Vault 设备信息 */
export interface VaultDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  lastSyncAt: string | null;
}

/** Vault 文件信息 */
export interface VaultFile {
  id: string;
  path: string;
  title: string;
  size: number;
  updatedAt: string;
}

/** Vault 详情响应 */
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

// ==================== 用户存储 ====================

/** 用户存储列表项 */
export interface UserStorageListItem {
  userId: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  storageUsed: number;
  storageLimit: number;
  vectorizedCount: number;
  vectorizedLimit: number;
  vaultCount: number;
}

/** 用户存储列表响应 */
export interface UserStorageListResponse {
  users: UserStorageListItem[];
  total: number;
}

/** 用户 Vault 信息 */
export interface UserVault {
  id: string;
  name: string;
  fileCount: number;
  totalSize: number;
  deviceCount: number;
  createdAt: string;
}

/** 用户存储详情响应 */
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
    vectorizedCount: number;
    vectorizedLimit: number;
  };
  vaults: UserVault[];
}

// ==================== 向量化 ====================

/** 向量化文件列表项 */
export interface VectorizedFileListItem {
  id: string;
  userId: string;
  userEmail: string;
  fileId: string;
  title: string;
  vectorizedAt: string;
  updatedAt: string;
}

/** 向量化文件列表响应 */
export interface VectorizedFileListResponse {
  files: VectorizedFileListItem[];
  total: number;
}

// ==================== 查询参数 ====================

/** Vault 列表查询参数 */
export interface VaultListParams {
  search?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

/** 用户存储列表查询参数 */
export interface UserStorageListParams {
  search?: string;
  limit?: number;
  offset?: number;
}

/** 向量化文件列表查询参数 */
export interface VectorizedFileListParams {
  userId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
