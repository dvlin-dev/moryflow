/**
 * Providers Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { providersApi, type CreateProviderRequest, type UpdateProviderRequest } from './api'

export const PROVIDERS_QUERY_KEY = ['providers'] as const
export const PRESETS_QUERY_KEY = ['preset-providers'] as const

/** 获取预设 Provider 列表 */
export function usePresetProviders() {
  return useQuery({
    queryKey: PRESETS_QUERY_KEY,
    queryFn: providersApi.getPresets,
  })
}

/** 获取 Provider 列表 */
export function useProviders() {
  return useQuery({
    queryKey: PROVIDERS_QUERY_KEY,
    queryFn: providersApi.getAll,
  })
}

/** 创建 Provider */
export function useCreateProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProviderRequest) => providersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY })
      toast.success('Provider 创建成功')
    },
    onError: (error: Error) => {
      toast.error(`创建失败：${error.message}`)
    },
  })
}

/** 更新 Provider */
export function useUpdateProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProviderRequest }) =>
      providersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY })
      toast.success('Provider 更新成功')
    },
    onError: (error: Error) => {
      toast.error(`更新失败：${error.message}`)
    },
  })
}

/** 删除 Provider */
export function useDeleteProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => providersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY })
      toast.success('Provider 删除成功')
    },
    onError: (error: Error) => {
      toast.error(`删除失败：${error.message}`)
    },
  })
}
