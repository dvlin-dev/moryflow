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

function persistCreatedApiKeyPlaintext(id: string, plainKey: string) {
  try {
    saveStoredApiKeyPlaintext(id, plainKey);
  } catch {
    toast.info(
      'Local browser storage is unavailable. Copy this key now; this browser may require a rotate later.'
    );
  }
}

function pruneStoredApiKeyPlaintextsSafely(apiKeys: Array<{ id: string; isActive: boolean }>) {
  try {
    pruneStoredApiKeyPlaintexts(apiKeys);
  } catch {
    // localStorage 不可用时仍应允许页面展示服务端返回的 key 列表
  }
}

function resolveStoredApiKeyPlaintextSafely(keyId: string): string | null {
  try {
    return resolveStoredApiKeyPlaintext(keyId);
  } catch {
    return null;
  }
}

function removeStoredApiKeyPlaintextSafely(keyId: string) {
  try {
    removeStoredApiKeyPlaintext(keyId);
  } catch {
    // localStorage 不可用时仍应允许 mutation 成功回写服务端事实
  }
}

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
      pruneStoredApiKeyPlaintextsSafely(apiKeys);

      return apiKeys.map((apiKey) => ({
        ...apiKey,
        plainKey: resolveStoredApiKeyPlaintextSafely(apiKey.id),
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
      persistCreatedApiKeyPlaintext(result.id, result.plainKey);
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
        removeStoredApiKeyPlaintextSafely(variables.id);
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
      removeStoredApiKeyPlaintextSafely(id);
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('Deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete');
    },
  });
}
