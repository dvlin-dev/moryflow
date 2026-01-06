/**
 * API Keys Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
} from './api'
import type { CreateApiKeyRequest, UpdateApiKeyRequest } from './types'

const QUERY_KEY = ['api-keys']

/** 获取 API Key 列表 */
export function useApiKeys() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getApiKeys,
  })
}

/** 创建 API Key */
export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateApiKeyRequest) => createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create')
    },
  })
}

/** 更新 API Key */
export function useUpdateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyRequest }) =>
      updateApiKey(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })
}

/** 删除 API Key */
export function useDeleteApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('Deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete')
    },
  })
}
