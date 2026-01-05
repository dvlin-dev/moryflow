/**
 * 模型管理 Context
 *
 * 统一管理模型列表、选择和状态
 * 支持未来扩展自定义 Provider
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMembershipModels } from '@/lib/server'
import { buildMembershipModelGroup } from './membership-source'
import type { UnifiedModel, ModelGroup } from './types'

const SELECTED_MODEL_KEY = 'selected_model_id'

interface ModelContextValue {
  /** 模型分组列表 */
  groups: ModelGroup[]
  /** 所有模型（扁平化） */
  allModels: UnifiedModel[]
  /** 可用模型（用户等级满足） */
  availableModels: UnifiedModel[]
  /** 当前选中的模型 ID */
  selectedModelId: string | null
  /** 当前选中的模型 */
  selectedModel: UnifiedModel | null
  /** 选择模型 */
  selectModel: (modelId: string) => void
  /** 是否正在加载 */
  isLoading: boolean
}

const ModelContext = createContext<ModelContextValue | null>(null)

export function ModelProvider({ children }: { children: ReactNode }) {
  const { models: membershipModels, modelsLoading } = useMembershipModels()
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // 构建模型分组
  const groups = useMemo(() => {
    const result: ModelGroup[] = []
    if (membershipModels.length > 0) {
      result.push(buildMembershipModelGroup(membershipModels))
    }
    // 未来扩展：添加自定义 Provider 分组
    return result
  }, [membershipModels])

  const allModels = useMemo(() => groups.flatMap((g) => g.models), [groups])
  const availableModels = useMemo(() => allModels.filter((m) => m.available), [allModels])

  // 从存储恢复选中的模型
  useEffect(() => {
    AsyncStorage.getItem(SELECTED_MODEL_KEY)
      .then((stored) => {
        if (stored) {
          setSelectedModelId(stored)
        }
        setInitialized(true)
      })
      .catch(() => setInitialized(true))
  }, [])

  // 自动选择默认模型（仅在初始化完成后，且没有选中模型时）
  useEffect(() => {
    if (!initialized || modelsLoading) return

    // 如果已选模型不在可用列表中，或没有选中模型，选择第一个可用模型
    const currentValid = selectedModelId && availableModels.some((m) => m.id === selectedModelId)
    if (!currentValid && availableModels.length > 0) {
      const defaultModel = availableModels[0]
      setSelectedModelId(defaultModel.id)
      AsyncStorage.setItem(SELECTED_MODEL_KEY, defaultModel.id).catch(() => {})
    }
  }, [initialized, modelsLoading, selectedModelId, availableModels])

  const selectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId)
    AsyncStorage.setItem(SELECTED_MODEL_KEY, modelId).catch(() => {})
  }, [])

  const selectedModel = useMemo(
    () => allModels.find((m) => m.id === selectedModelId) ?? null,
    [allModels, selectedModelId]
  )

  const value = useMemo<ModelContextValue>(
    () => ({
      groups,
      allModels,
      availableModels,
      selectedModelId,
      selectedModel,
      selectModel,
      isLoading: modelsLoading || !initialized,
    }),
    [groups, allModels, availableModels, selectedModelId, selectedModel, selectModel, modelsLoading, initialized]
  )

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
}

/** 获取完整的模型上下文 */
export function useModels() {
  const context = useContext(ModelContext)
  if (!context) {
    throw new Error('useModels must be used within ModelProvider')
  }
  return context
}

/** 获取当前选中的模型 */
export function useSelectedModel() {
  const { selectedModel, selectedModelId, selectModel } = useModels()
  return { model: selectedModel, modelId: selectedModelId, selectModel }
}

/** 获取可用模型列表 */
export function useAvailableModels() {
  const { availableModels, isLoading } = useModels()
  return { models: availableModels, isLoading }
}
