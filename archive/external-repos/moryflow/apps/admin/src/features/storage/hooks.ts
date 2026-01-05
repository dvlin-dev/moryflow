/**
 * 云同步管理 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { storageApi } from './api'
import { STORAGE_QUERY_KEYS, DEFAULT_PAGE_SIZE } from './const'
import type {
  VaultListParams,
  UserStorageListParams,
  VectorizedFileListParams,
} from '@/types/storage'

// ==================== 统计 ====================

/**
 * 获取云同步统计
 */
export function useStorageStats() {
  return useQuery({
    queryKey: STORAGE_QUERY_KEYS.stats(),
    queryFn: () => storageApi.getStats(),
  })
}

// ==================== Vault 管理 ====================

/**
 * 获取 Vault 列表
 */
export function useVaultList(params: {
  page: number
  pageSize?: number
  search?: string
  userId?: string
}) {
  const { page, pageSize = DEFAULT_PAGE_SIZE, search, userId } = params
  const queryParams: VaultListParams = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: search || undefined,
    userId: userId || undefined,
  }

  return useQuery({
    queryKey: STORAGE_QUERY_KEYS.vaultList(queryParams as Record<string, unknown>),
    queryFn: () => storageApi.getVaultList(queryParams),
  })
}

/**
 * 获取 Vault 详情（懒加载）
 */
export function useVaultDetail(id: string | null) {
  return useQuery({
    queryKey: STORAGE_QUERY_KEYS.vaultDetail(id ?? ''),
    queryFn: () => storageApi.getVaultDetail(id!),
    enabled: !!id,
  })
}

/**
 * 删除 Vault
 */
export function useDeleteVault() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => storageApi.deleteVault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORAGE_QUERY_KEYS.all })
      toast.success('Vault 已删除')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })
}

// ==================== 用户存储管理 ====================

/**
 * 获取用户存储列表
 */
export function useUserStorageList(params: {
  page: number
  pageSize?: number
  search?: string
}) {
  const { page, pageSize = DEFAULT_PAGE_SIZE, search } = params
  const queryParams: UserStorageListParams = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: search || undefined,
  }

  return useQuery({
    queryKey: STORAGE_QUERY_KEYS.userList(queryParams as Record<string, unknown>),
    queryFn: () => storageApi.getUserStorageList(queryParams),
  })
}

/**
 * 获取用户存储详情
 */
export function useUserStorageDetail(userId: string | null) {
  return useQuery({
    queryKey: STORAGE_QUERY_KEYS.userDetail(userId ?? ''),
    queryFn: () => storageApi.getUserStorageDetail(userId!),
    enabled: !!userId,
  })
}

// ==================== 向量化管理 ====================

/**
 * 获取向量化文件列表
 */
export function useVectorizedFileList(params: {
  page: number
  pageSize?: number
  search?: string
  userId?: string
}) {
  const { page, pageSize = DEFAULT_PAGE_SIZE, search, userId } = params
  const queryParams: VectorizedFileListParams = {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: search || undefined,
    userId: userId || undefined,
  }

  return useQuery({
    queryKey: STORAGE_QUERY_KEYS.vectorizedList(queryParams as Record<string, unknown>),
    queryFn: () => storageApi.getVectorizedFileList(queryParams),
  })
}

/**
 * 删除向量化记录
 */
export function useDeleteVectorizedFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => storageApi.deleteVectorizedFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORAGE_QUERY_KEYS.vectorized() })
      queryClient.invalidateQueries({ queryKey: STORAGE_QUERY_KEYS.stats() })
      toast.success('向量化记录已删除')
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`)
    },
  })
}
