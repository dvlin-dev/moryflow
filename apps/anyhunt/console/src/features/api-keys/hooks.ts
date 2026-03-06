/**
 * API Keys Hooks
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiKeys, createApiKey, updateApiKey, deleteApiKey } from './api';
import type { CreateApiKeyRequest, UpdateApiKeyRequest } from './types';
import {
  pruneStoredApiKeyPlaintexts,
  removeStoredApiKeyPlaintext,
  resolveStoredApiKeyPlaintext,
  saveStoredApiKeyPlaintext,
} from './local-key-store';

/** Query Key 工厂 */
export const apiKeyKeys = {
  all: ['api-keys'] as const,
  list: () => [...apiKeyKeys.all, 'list'] as const,
};

/** 获取 API Key 列表 */
export function useApiKeys() {
  return useQuery({
    queryKey: apiKeyKeys.list(),
    queryFn: async () => {
      const apiKeys = await getApiKeys();
      pruneStoredApiKeyPlaintexts(apiKeys);

      return apiKeys.map((apiKey) => ({
        ...apiKey,
        plainKey: resolveStoredApiKeyPlaintext(apiKey.id),
      }));
    },
  });
}

/** 创建 API Key */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyRequest) => createApiKey(data),
    onSuccess: (result) => {
      saveStoredApiKeyPlaintext(result.id, result.plainKey);
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create');
    },
  });
}

/** 更新 API Key */
export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyRequest }) => updateApiKey(id, data),
    onSuccess: (result, variables) => {
      if (variables.data.isActive === false || result.isActive === false) {
        removeStoredApiKeyPlaintext(variables.id);
      }
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('Updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update');
    },
  });
}

/** 删除 API Key */
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: (_, id) => {
      removeStoredApiKeyPlaintext(id);
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('Deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete');
    },
  });
}
