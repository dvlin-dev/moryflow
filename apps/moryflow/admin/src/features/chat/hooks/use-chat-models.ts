/**
 * [PROVIDES]: useChatModels - 模型列表查询与选中管理
 * [DEPENDS]: react-query, localStorage
 * [POS]: 聊天模块的模型选择 Hook
 */
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { fetchModels } from '../api';
import type { ModelOption } from '../types';

const MODEL_STORAGE_KEY = 'admin.chat.preferredModel';

function readStoredModelId(): string {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeStoredModelId(value: string): void {
  try {
    if (value) {
      localStorage.setItem(MODEL_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(MODEL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function useChatModels() {
  const [storedModelId, setStoredModelIdState] = useState(() => readStoredModelId());

  const {
    data: modelGroups = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['chat-models'],
    queryFn: fetchModels,
    staleTime: 1000 * 60 * 5, // 5 分钟
  });

  const defaultModelId = useMemo(() => modelGroups[0]?.options[0]?.id ?? '', [modelGroups]);
  const selectedModelId = storedModelId || defaultModelId;

  useEffect(() => {
    if (!storedModelId && defaultModelId) {
      writeStoredModelId(defaultModelId);
    }
  }, [storedModelId, defaultModelId]);

  const setSelectedModelId = useCallback((id: string) => {
    setStoredModelIdState(id);
    writeStoredModelId(id);
  }, []);

  const selectedModel: ModelOption | null =
    modelGroups.flatMap((g) => g.options).find((m) => m.id === selectedModelId) ?? null;

  return {
    modelGroups,
    selectedModelId,
    selectedModel,
    setSelectedModelId,
    isLoading,
    error,
  };
}
