/**
 * [PROVIDES]: 云同步路径 canonical 化与校验工具
 * [DEPENDS]: 无外部依赖
 * [POS]: PC/Mobile/Server 共享的 path 合同事实源
 */

const WINDOWS_DRIVE_PREFIX = /^[a-zA-Z]:\//;
const INVALID_WINDOWS_SEGMENT_CHARS = new Set(['<', '>', ':', '"', '|', '?', '*']);

export function normalizeSyncPath(rawPath: string): string {
  return rawPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '');
}

export function isSafeRelativeSyncPath(rawPath: string): boolean {
  const normalized = normalizeSyncPath(rawPath);
  if (normalized.length === 0) return false;
  if (normalized.startsWith('/') || WINDOWS_DRIVE_PREFIX.test(normalized)) {
    return false;
  }

  const segments = normalized.split('/');
  if (segments.some((segment) => segment.length === 0)) {
    return false;
  }

  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      return false;
    }
    if (segment.trim() !== segment) {
      return false;
    }
    if (
      Array.from(segment).some((char) => INVALID_WINDOWS_SEGMENT_CHARS.has(char) || char === '\0')
    ) {
      return false;
    }
    if (segment.endsWith('.') || segment.endsWith(' ')) {
      return false;
    }
  }

  return true;
}
