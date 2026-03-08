/**
 * [PROVIDES]: maskApiKey - API Key 脱敏展示
 * [DEPENDS]: none
 * [POS]: Console API Key UI 辅助函数
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import type { ApiKey } from './types';

const DEFAULT_PREFIX_LENGTH = 8;
const DEFAULT_SUFFIX_LENGTH = 4;
const MASK_SEGMENT = '******';

export function maskApiKey(
  apiKey: string,
  options?: { prefixLength?: number; suffixLength?: number }
) {
  if (!apiKey) return '';
  const prefixLength = options?.prefixLength ?? DEFAULT_PREFIX_LENGTH;
  const suffixLength = options?.suffixLength ?? DEFAULT_SUFFIX_LENGTH;

  if (apiKey.length <= prefixLength + suffixLength) {
    return apiKey;
  }

  return `${apiKey.slice(0, prefixLength)}${MASK_SEGMENT}${apiKey.slice(-suffixLength)}`;
}

export function getApiKeyDisplay(apiKey: Pick<ApiKey, 'plainKey' | 'keyPreview'> | null): string {
  if (!apiKey) {
    return '';
  }

  if (apiKey.plainKey) {
    return maskApiKey(apiKey.plainKey);
  }

  return apiKey.keyPreview;
}

export interface ActiveApiKeySelection {
  activeKeys: ApiKey[];
  selectedKey: ApiKey | null;
  effectiveKeyId: string;
  apiKeyValue: string;
  apiKeyDisplay: string;
  hasActiveKey: boolean;
  hasUsableKey: boolean;
}

function normalizeSelectedKeyId(selectedKeyId: string | null | undefined): string {
  if (!selectedKeyId || selectedKeyId === 'none') {
    return '';
  }

  return selectedKeyId;
}

export function resolveActiveApiKeySelection(
  apiKeys: ApiKey[],
  selectedKeyId: string | null | undefined
): ActiveApiKeySelection {
  const activeKeys = apiKeys.filter((key) => key.isActive);
  const normalizedSelectedKeyId = normalizeSelectedKeyId(selectedKeyId);
  const selectedKey =
    activeKeys.find((key) => key.id === normalizedSelectedKeyId) ?? activeKeys[0] ?? null;

  return {
    activeKeys,
    selectedKey,
    effectiveKeyId: selectedKey?.id ?? '',
    apiKeyValue: selectedKey?.plainKey ?? '',
    apiKeyDisplay: getApiKeyDisplay(selectedKey),
    hasActiveKey: Boolean(selectedKey),
    hasUsableKey: Boolean(selectedKey?.plainKey),
  };
}
