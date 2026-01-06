/**
 * 模型选择 Hook
 */
import { useQuery } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'
import { fetchModels } from '../api'
import type { ModelOption } from '../types'

const MODEL_STORAGE_KEY = 'admin.chat.preferredModel'

function readStoredModelId(): string {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeStoredModelId(value: string): void {
  try {
    if (value) {
      localStorage.setItem(MODEL_STORAGE_KEY, value)
    } else {
      localStorage.removeItem(MODEL_STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

export function useChatModels() {
  const [selectedModelId, setSelectedModelIdState] = useState(() => readStoredModelId())

  const { data: modelGroups = [], isLoading, error } = useQuery({
    queryKey: ['chat-models'],
    queryFn: fetchModels,
    staleTime: 1000 * 60 * 5, // 5 分钟
  })

  // 自动选择第一个可用模型
  useEffect(() => {
    if (!selectedModelId && modelGroups.length > 0) {
      const firstModel = modelGroups[0]?.options[0]
      if (firstModel) {
        setSelectedModelIdState(firstModel.id)
        writeStoredModelId(firstModel.id)
      }
    }
  }, [modelGroups, selectedModelId])

  const setSelectedModelId = useCallback((id: string) => {
    setSelectedModelIdState(id)
    writeStoredModelId(id)
  }, [])

  const selectedModel: ModelOption | null = modelGroups
    .flatMap((g) => g.options)
    .find((m) => m.id === selectedModelId) ?? null

  return {
    modelGroups,
    selectedModelId,
    selectedModel,
    setSelectedModelId,
    isLoading,
    error,
  }
}
