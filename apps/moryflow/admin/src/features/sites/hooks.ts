/**
 * Sites Hooks
 * 站点管理 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { sitesApi } from './api'
import type { SiteListParams, SiteUpdateData } from './types'

export const SITES_QUERY_KEY = ['admin-sites'] as const

/** 获取站点列表 */
export function useSites(params: {
  page: number
  pageSize: number
  search?: string
  status?: string
  type?: string
  userTier?: string
  expiryFilter?: string
}) {
  const queryParams: SiteListParams = {
    limit: params.pageSize,
    offset: (params.page - 1) * params.pageSize,
    search: params.search || undefined,
    status: params.status as SiteListParams['status'],
    type: params.type as SiteListParams['type'],
    userTier: params.userTier as SiteListParams['userTier'],
    expiryFilter: params.expiryFilter as SiteListParams['expiryFilter'],
  }

  return useQuery({
    queryKey: [
      ...SITES_QUERY_KEY,
      params.search,
      params.status,
      params.type,
      params.userTier,
      params.expiryFilter,
      params.page,
    ],
    queryFn: () => sitesApi.getAll(queryParams),
  })
}

/** 获取站点统计 */
export function useSiteStats() {
  return useQuery({
    queryKey: [...SITES_QUERY_KEY, 'stats'],
    queryFn: () => sitesApi.getStats(),
  })
}

/** 获取站点详情 */
export function useSiteDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-site', id],
    queryFn: () => sitesApi.getById(id!),
    enabled: !!id,
  })
}

/** 强制下线站点 */
export function useOfflineSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sitesApi.offline(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['admin-site', id] })
      toast.success('站点已下线')
    },
    onError: (error: Error) => {
      toast.error(`下线失败：${error.message}`)
    },
  })
}

/** 恢复上线站点 */
export function useOnlineSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sitesApi.online(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['admin-site', id] })
      toast.success('站点已上线')
    },
    onError: (error: Error) => {
      toast.error(`上线失败：${error.message}`)
    },
  })
}

/** 更新站点配置 */
export function useUpdateSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SiteUpdateData }) =>
      sitesApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['admin-site', result.id] })
      toast.success('站点配置已更新')
    },
    onError: (error: Error) => {
      toast.error(`更新失败：${error.message}`)
    },
  })
}

/** 删除站点 */
export function useDeleteSite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => sitesApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['admin-site', id] })
      toast.success('站点已删除')
    },
    onError: (error: Error) => {
      toast.error(`删除失败：${error.message}`)
    },
  })
}
