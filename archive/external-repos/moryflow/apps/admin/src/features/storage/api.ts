/**
 * 云同步管理 API
 */

import { adminApi } from '@/lib/api'
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
} from '@/types/storage'

/**
 * 构建查询字符串
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })
  return searchParams.toString()
}

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
  getVaultList: (params: VaultListParams) => {
    const qs = buildQueryString(params as Record<string, unknown>)
    return adminApi.get<VaultListResponse>(`/storage/vaults${qs ? `?${qs}` : ''}`)
  },

  /**
   * 获取 Vault 详情
   */
  getVaultDetail: (id: string) => adminApi.get<VaultDetailResponse>(`/storage/vaults/${id}`),

  /**
   * 删除 Vault
   */
  deleteVault: (id: string) => adminApi.delete<{ success: boolean }>(`/storage/vaults/${id}`),

  // ==================== 用户存储管理 ====================

  /**
   * 获取用户存储列表
   */
  getUserStorageList: (params: UserStorageListParams) => {
    const qs = buildQueryString(params as Record<string, unknown>)
    return adminApi.get<UserStorageListResponse>(`/storage/users${qs ? `?${qs}` : ''}`)
  },

  /**
   * 获取用户存储详情
   */
  getUserStorageDetail: (userId: string) =>
    adminApi.get<UserStorageDetailResponse>(`/storage/users/${userId}`),

  // ==================== 向量化管理 ====================

  /**
   * 获取向量化文件列表
   */
  getVectorizedFileList: (params: VectorizedFileListParams) => {
    const qs = buildQueryString(params as Record<string, unknown>)
    return adminApi.get<VectorizedFileListResponse>(`/storage/vectorized${qs ? `?${qs}` : ''}`)
  },

  /**
   * 删除向量化记录
   */
  deleteVectorizedFile: (id: string) =>
    adminApi.delete<{ success: boolean }>(`/storage/vectorized/${id}`),
}
