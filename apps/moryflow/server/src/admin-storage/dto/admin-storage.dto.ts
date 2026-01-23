/**
 * Admin Storage DTO
 * 云同步管理接口的请求/响应类型定义
 */

import { z } from 'zod';

// ==================== 请求参数 ====================

/** Vault 列表查询参数 */
export const VaultListQuerySchema = z.object({
  search: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type VaultListQuery = z.infer<typeof VaultListQuerySchema>;

/** 用户存储列表查询参数 */
export const UserStorageListQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type UserStorageListQuery = z.infer<typeof UserStorageListQuerySchema>;

/** 向量化文件列表查询参数 */
export const VectorizedFileListQuerySchema = z.object({
  userId: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type VectorizedFileListQuery = z.infer<
  typeof VectorizedFileListQuerySchema
>;

// ==================== 响应类型 ====================

/** 云同步整体统计 */
export interface StorageStatsResponse {
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
  devices: Array<{
    id: string;
    deviceId: string;
    deviceName: string;
    lastSyncAt: string | null;
  }>;
  recentFiles: Array<{
    id: string;
    path: string;
    title: string;
    size: number;
    updatedAt: string;
  }>;
}

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
  vaults: Array<{
    id: string;
    name: string;
    fileCount: number;
    totalSize: number;
    deviceCount: number;
    createdAt: string;
  }>;
}

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
