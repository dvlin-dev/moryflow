/**
 * [PROVIDES]: maskApiKey - API Key 脱敏展示
 * [DEPENDS]: none
 * [POS]: Console API Key UI 辅助函数
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

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
