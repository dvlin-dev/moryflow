/**
 * Mobile 端设置存储
 *
 * 管理 Agent 设置，包括：
 * - 模型配置
 * - 服务商配置
 * - API Key（安全存储）
 *
 * 与 PC 端 agent-settings 对应。
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import type { AgentSettings, UserProviderConfig, CustomProviderConfig } from '@aiget/agents-runtime'

// 重新导出类型
export type { AgentSettings, UserProviderConfig, CustomProviderConfig }

const SETTINGS_KEY = 'agent_settings'
const API_KEY_PREFIX = 'api_key_'

// 设置变更监听器类型
type SettingsChangeListener = (settings: AgentSettings) => void

// 内部状态
let currentSettings: AgentSettings | null = null
const listeners: Set<SettingsChangeListener> = new Set()

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: AgentSettings = {
  model: {
    defaultModel: null,
  },
  providers: [],
  customProviders: [],
}

/**
 * 加载设置
 * 从 AsyncStorage 加载设置，API Key 从 SecureStore 加载
 */
export async function loadSettings(): Promise<AgentSettings> {
  if (currentSettings) {
    return currentSettings
  }

  const stored = await AsyncStorage.getItem(SETTINGS_KEY)
  if (!stored) {
    currentSettings = { ...DEFAULT_SETTINGS }
    return currentSettings
  }

  try {
    const settings = JSON.parse(stored) as AgentSettings

    // 从 SecureStore 恢复 API Keys
    for (const provider of settings.providers) {
      const key = await SecureStore.getItemAsync(`${API_KEY_PREFIX}${provider.providerId}`)
      if (key) {
        provider.apiKey = key
      }
    }

    for (const provider of settings.customProviders) {
      const key = await SecureStore.getItemAsync(`${API_KEY_PREFIX}custom_${provider.providerId}`)
      if (key) {
        provider.apiKey = key
      }
    }

    currentSettings = settings
    return settings
  } catch (error) {
    console.error('[SettingsStore] Failed to parse settings:', error)
    currentSettings = { ...DEFAULT_SETTINGS }
    return currentSettings
  }
}

/**
 * 保存设置
 * API Keys 单独存储到 SecureStore
 */
export async function saveSettings(settings: AgentSettings): Promise<void> {
  // 复制一份用于存储，移除 API Keys
  const settingsToStore: AgentSettings = {
    ...settings,
    providers: settings.providers.map((p) => ({ ...p, apiKey: '' })),
    customProviders: settings.customProviders.map((p) => ({ ...p, apiKey: '' })),
  }

  // 存储 API Keys 到 SecureStore
  for (const provider of settings.providers) {
    if (provider.apiKey) {
      await SecureStore.setItemAsync(`${API_KEY_PREFIX}${provider.providerId}`, provider.apiKey)
    } else {
      await SecureStore.deleteItemAsync(`${API_KEY_PREFIX}${provider.providerId}`)
    }
  }

  for (const provider of settings.customProviders) {
    if (provider.apiKey) {
      await SecureStore.setItemAsync(
        `${API_KEY_PREFIX}custom_${provider.providerId}`,
        provider.apiKey
      )
    } else {
      await SecureStore.deleteItemAsync(`${API_KEY_PREFIX}custom_${provider.providerId}`)
    }
  }

  // 存储设置到 AsyncStorage
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToStore))

  // 更新内存缓存
  currentSettings = settings

  // 通知监听器
  notifyListeners(settings)
}

/**
 * 更新部分设置
 */
export async function updateSettings(partial: Partial<AgentSettings>): Promise<AgentSettings> {
  const current = await loadSettings()
  const updated = { ...current, ...partial }
  await saveSettings(updated)
  return updated
}

/**
 * 更新服务商配置
 */
export async function updateProvider(
  providerId: string,
  updates: Partial<UserProviderConfig>
): Promise<void> {
  const settings = await loadSettings()
  const index = settings.providers.findIndex((p) => p.providerId === providerId)

  if (index >= 0) {
    settings.providers[index] = { ...settings.providers[index], ...updates }
    await saveSettings(settings)
  }
}

/**
 * 添加或更新自定义服务商
 */
export async function upsertCustomProvider(provider: CustomProviderConfig): Promise<void> {
  const settings = await loadSettings()
  const index = settings.customProviders.findIndex((p) => p.providerId === provider.providerId)

  if (index >= 0) {
    settings.customProviders[index] = provider
  } else {
    settings.customProviders.push(provider)
  }

  await saveSettings(settings)
}

/**
 * 删除自定义服务商
 */
export async function removeCustomProvider(providerId: string): Promise<void> {
  const settings = await loadSettings()
  settings.customProviders = settings.customProviders.filter((p) => p.providerId !== providerId)
  await SecureStore.deleteItemAsync(`${API_KEY_PREFIX}custom_${providerId}`)
  await saveSettings(settings)
}

/**
 * 设置默认模型
 */
export async function setDefaultModel(modelId: string | null): Promise<void> {
  const settings = await loadSettings()
  settings.model.defaultModel = modelId
  await saveSettings(settings)
}

/**
 * 获取当前设置（同步版本，需要先调用 loadSettings）
 */
export function getSettings(): AgentSettings {
  return currentSettings || DEFAULT_SETTINGS
}

/**
 * 监听设置变更
 */
export function onSettingsChange(listener: SettingsChangeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 通知所有监听器
 */
function notifyListeners(settings: AgentSettings): void {
  listeners.forEach((listener) => {
    try {
      listener(settings)
    } catch (error) {
      console.error('[SettingsStore] Listener error:', error)
    }
  })
}

/**
 * 重置设置
 *
 * 清理所有设置数据，包括 API Keys
 */
export async function resetSettings(): Promise<void> {
  // 先加载当前设置以获取所有 provider IDs
  const settings = currentSettings || (await loadSettingsInternal())

  // 清理所有 API Keys
  const deletePromises: Promise<void>[] = []

  for (const provider of settings.providers) {
    deletePromises.push(SecureStore.deleteItemAsync(`${API_KEY_PREFIX}${provider.providerId}`))
  }

  for (const provider of settings.customProviders) {
    deletePromises.push(SecureStore.deleteItemAsync(`${API_KEY_PREFIX}custom_${provider.providerId}`))
  }

  await Promise.all(deletePromises)

  // 清理 AsyncStorage
  await AsyncStorage.removeItem(SETTINGS_KEY)

  // 重置内存缓存
  currentSettings = null

  // 通知监听器
  notifyListeners(DEFAULT_SETTINGS)
}

/**
 * 内部加载函数（不更新缓存）
 */
async function loadSettingsInternal(): Promise<AgentSettings> {
  const stored = await AsyncStorage.getItem(SETTINGS_KEY)
  if (!stored) {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    return JSON.parse(stored) as AgentSettings
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}
