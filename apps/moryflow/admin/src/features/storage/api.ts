/**
 * 云同步管理 API
 */

import { adminApi } from '@/lib/api';
import type {
  StorageStats,
  VaultListResponse,
  VaultDetailResponse,
  VaultListParams,
  UserStorageListResponse,
  UserStorageDetailResponse,
  UserStorageListParams,
  VectorizedFileListResponse,
  VectorizedFileListParams,
} from '@/types/storage';
import {
  buildUserStorageListPath,
  buildVaultListPath,
  buildVectorizedFileListPath,
} from './query-paths';

export const storageApi = {
  // ==================== 统计 ====================

  /**
   * 获取云同步统计
   */
  getStats: () => adminApi.get<StorageStats>('/storage/stats'),

  // ==================== Vault 管理 ====================

  /**
   * 获取 Vault 列表
   */
  getVaultList: (params: VaultListParams) =>
    adminApi.get<VaultListResponse>(buildVaultListPath(params)),

  /**
   * 获取 Vault 详情
   */
  getVaultDetail: (id: string) => adminApi.get<VaultDetailResponse>(`/storage/vaults/${id}`),

  /**
   * 删除 Vault
   */
  deleteVault: (id: string) => adminApi.delete<void>(`/storage/vaults/${id}`),

  // ==================== 用户存储管理 ====================

  /**
   * 获取用户存储列表
   */
  getUserStorageList: (params: UserStorageListParams) =>
    adminApi.get<UserStorageListResponse>(buildUserStorageListPath(params)),

  /**
   * 获取用户存储详情
   */
  getUserStorageDetail: (userId: string) =>
    adminApi.get<UserStorageDetailResponse>(`/storage/users/${userId}`),

  // ==================== 向量化管理 ====================

  /**
   * 获取向量化文件列表
   */
  getVectorizedFileList: (params: VectorizedFileListParams) =>
    adminApi.get<VectorizedFileListResponse>(buildVectorizedFileListPath(params)),

  /**
   * 删除向量化记录
   */
  deleteVectorizedFile: (id: string) => adminApi.delete<void>(`/storage/vectorized/${id}`),
};
