/**
 * Webhooks Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
} from './api';
import type { CreateWebhookRequest, UpdateWebhookRequest } from './types';

/** Query Key 工厂 */
export const webhookKeys = {
  all: ['webhooks'] as const,
  list: (apiKey: string) => [...webhookKeys.all, 'list', apiKey] as const,
};

/** 获取 Webhook 列表 */
export function useWebhooks(apiKey: string) {
  return useQuery({
    queryKey: webhookKeys.list(apiKey),
    queryFn: () => getWebhooks(apiKey),
    enabled: !!apiKey,
  });
}

/** 创建 Webhook */
export function useCreateWebhook(apiKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWebhookRequest) => createWebhook(apiKey, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create');
    },
  });
}

/** 更新 Webhook */
export function useUpdateWebhook(apiKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookRequest }) =>
      updateWebhook(apiKey, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update');
    },
  });
}

/** 删除 Webhook */
export function useDeleteWebhook(apiKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWebhook(apiKey, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete');
    },
  });
}

/** 重新生成 Secret */
export function useRegenerateWebhookSecret(apiKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => regenerateWebhookSecret(apiKey, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Secret regenerated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to regenerate');
    },
  });
}
