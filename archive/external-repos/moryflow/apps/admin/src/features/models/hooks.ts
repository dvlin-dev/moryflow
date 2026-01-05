/**
 * Models Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { modelsApi, type CreateModelRequest, type UpdateModelRequest } from './api'

export const MODELS_QUERY_KEY = ['models'] as const

/** 获取 Model 列表 */
export function useModels(providerId?: string) {
  return useQuery({
    queryKey: [...MODELS_QUERY_KEY, providerId],
    queryFn: () => modelsApi.getAll(providerId === 'all' ? undefined : providerId),
  })
}

/** 创建 Model */
export function useCreateModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateModelRequest) => modelsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY })
      toast.success('Model 创建成功')
    },
    onError: (error: Error) => {
      toast.error(`创建失败：${error.message}`)
    },
  })
}

/** 更新 Model */
export function useUpdateModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModelRequest }) =>
      modelsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY })
      toast.success('Model 更新成功')
    },
    onError: (error: Error) => {
      toast.error(`更新失败：${error.message}`)
    },
  })
}

/** 删除 Model */
export function useDeleteModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => modelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY })
      toast.success('Model 删除成功')
    },
    onError: (error: Error) => {
      toast.error(`删除失败：${error.message}`)
    },
  })
}
