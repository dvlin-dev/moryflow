/**
 * Webhooks Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
} from './api'
import type { CreateWebhookRequest, UpdateWebhookRequest } from './types'

/** Query Key 工厂 */
export const webhookKeys = {
  all: ['webhooks'] as const,
  list: () => [...webhookKeys.all, 'list'] as const,
}

/** 获取 Webhook 列表 */
export function useWebhooks() {
  return useQuery({
    queryKey: webhookKeys.list(),
    queryFn: getWebhooks,
  })
}

/** 创建 Webhook */
export function useCreateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateWebhookRequest) => createWebhook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all })
      toast.success('Created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create')
    },
  })
}

/** 更新 Webhook */
export function useUpdateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookRequest }) =>
      updateWebhook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all })
      toast.success('Updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update')
    },
  })
}

/** 删除 Webhook */
export function useDeleteWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all })
      toast.success('Deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete')
    },
  })
}

/** 重新生成 Secret */
export function useRegenerateWebhookSecret() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => regenerateWebhookSecret(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all })
      toast.success('Secret regenerated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to regenerate')
    },
  })
}
