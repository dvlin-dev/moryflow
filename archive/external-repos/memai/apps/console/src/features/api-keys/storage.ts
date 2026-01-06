/**
 * API Key 本地存储
 * 用于在 localStorage 中保存完整的 API Key，以便在 Playground 中使用
 */

const STORAGE_KEY = 'memai_api_keys'

export interface StoredApiKey {
  id: string
  name: string
  key: string // 完整的 API Key
  createdAt: string
}

/**
 * 获取所有已存储的 API Key
 */
export function getStoredApiKeys(): StoredApiKey[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * 存储一个新的 API Key
 */
export function storeApiKey(id: string, name: string, key: string): void {
  const keys = getStoredApiKeys()
  // 检查是否已存在（按 id）
  const existingIndex = keys.findIndex((k) => k.id === id)
  const newKey: StoredApiKey = {
    id,
    name,
    key,
    createdAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    keys[existingIndex] = newKey
  } else {
    keys.push(newKey)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

/**
 * 根据 id 获取已存储的 API Key
 */
export function getStoredApiKeyById(id: string): StoredApiKey | undefined {
  const keys = getStoredApiKeys()
  return keys.find((k) => k.id === id)
}

/**
 * 删除一个已存储的 API Key
 */
export function removeStoredApiKey(id: string): void {
  const keys = getStoredApiKeys()
  const filtered = keys.filter((k) => k.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

/**
 * 清理已删除的 API Key（与服务器列表同步）
 */
export function syncStoredApiKeys(serverKeyIds: string[]): void {
  const keys = getStoredApiKeys()
  const filtered = keys.filter((k) => serverKeyIds.includes(k.id))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
