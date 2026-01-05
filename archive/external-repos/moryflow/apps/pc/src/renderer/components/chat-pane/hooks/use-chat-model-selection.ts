import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentChatRequestOptions, AgentSettings } from '@shared/ipc'

import { computeAgentOptions } from '../handle'
import { buildModelGroupsFromProviders, ensureModelIncluded, type ModelGroup } from '../models'

const MODEL_STORAGE_KEY = 'moryflow.chat.preferredModel'

const readStoredModelId = () => {
  if (typeof window === 'undefined') {
    return ''
  }
  try {
    return window.localStorage.getItem(MODEL_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

const writeStoredModelId = (value: string) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    if (value) {
      window.localStorage.setItem(MODEL_STORAGE_KEY, value)
    } else {
      window.localStorage.removeItem(MODEL_STORAGE_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

export const useChatModelSelection = (activeFilePath?: string | null) => {
  const [selectedModelId, setSelectedModelIdState] = useState(() => readStoredModelId())
  const selectedModelIdRef = useRef(selectedModelId)
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([])
  const agentOptionsRef = useRef<AgentChatRequestOptions | undefined>(
    computeAgentOptions({ activeFilePath, preferredModelId: selectedModelId })
  )

  const updateSelection = useCallback(
    (next: string, options?: { syncRemote?: boolean }) => {
      const normalized = next?.trim() ?? ''
      if (selectedModelIdRef.current === normalized) {
        return
      }
      selectedModelIdRef.current = normalized
      setSelectedModelIdState(normalized)
      writeStoredModelId(normalized)
      if (options?.syncRemote === false || !window.desktopAPI?.agent?.updateSettings) {
        return
      }
      window.desktopAPI.agent
        .updateSettings({ model: { defaultModel: normalized } })
        .catch((error) => {
          console.error('[chat-pane] failed to persist preferred model', error)
        })
    },
    []
  )

  useEffect(() => {
    agentOptionsRef.current = computeAgentOptions({
      activeFilePath,
      preferredModelId: selectedModelId,
    })
  }, [activeFilePath, selectedModelId])

  useEffect(() => {
    selectedModelIdRef.current = selectedModelId
  }, [selectedModelId])

  const applySettings = useCallback((settings: AgentSettings) => {
    const baseGroups = buildModelGroupsFromProviders(settings)
    const groupsWithSelection = ensureModelIncluded(
      baseGroups,
      selectedModelIdRef.current || settings.model?.defaultModel,
      '自定义'
    )
    setModelGroups(groupsWithSelection)
    const hasSelected =
      selectedModelIdRef.current &&
      groupsWithSelection.some((group) =>
        group.options.some((option) => option.id === selectedModelIdRef.current)
      )
    if (hasSelected) {
      return
    }
    const candidate =
      settings.model?.defaultModel?.trim() ||
      settings.providers
        ?.find((provider) => provider.enabled && provider.defaultModelId?.trim())
        ?.defaultModelId?.trim() ||
      groupsWithSelection.find((group) => group.options.some((option) => !option.disabled))
        ?.options.find((option) => !option.disabled)?.id ||
      ''
    updateSelection(candidate || '', { syncRemote: false })
  }, [updateSelection])

  useEffect(() => {
    let mounted = true
    const loadSettings = async () => {
      if (!window.desktopAPI?.agent) {
        return
      }
      try {
        const settings = await window.desktopAPI.agent.getSettings()
        if (mounted && settings) {
          applySettings(settings as AgentSettings)
        }
      } catch (error) {
        console.error('[chat-pane] failed to load agent settings', error)
      }
    }
    void loadSettings()
    return () => {
      mounted = false
    }
  }, [applySettings])

  useEffect(() => {
    if (!window.desktopAPI?.agent?.onSettingsChange) {
      return
    }
    const dispose = window.desktopAPI.agent.onSettingsChange((settings: AgentSettings) => {
      applySettings(settings)
    })
    return () => dispose?.()
  }, [applySettings])

  const setSelectedModelId = useCallback(
    (next: string) => {
      updateSelection(next)
    },
    [updateSelection]
  )

  return {
    selectedModelId,
    setSelectedModelId,
    modelGroups,
    agentOptionsRef,
  }
}
