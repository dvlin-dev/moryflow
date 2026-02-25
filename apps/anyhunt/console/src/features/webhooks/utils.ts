/**
 * [PROVIDES]: resolveActiveApiKeySelection
 * [DEPENDS]: api-keys types
 * [POS]: Webhooks 页面 API Key 选择修复工具（active key only）
 */
import type { ApiKey } from '@/features/api-keys'

export interface ActiveApiKeySelection {
  activeKeys: ApiKey[]
  selectedKey: ApiKey | null
  effectiveKeyId: string
}

export function resolveActiveApiKeySelection(
  apiKeys: ApiKey[],
  selectedKeyId: string
): ActiveApiKeySelection {
  const activeKeys = apiKeys.filter((key) => key.isActive)
  const selectedKey = activeKeys.find((key) => key.id === selectedKeyId) ?? activeKeys[0] ?? null

  return {
    activeKeys,
    selectedKey,
    effectiveKeyId: selectedKey?.id ?? '',
  }
}

