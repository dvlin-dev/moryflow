/**
 * [PROVIDES]: API_BASE_URL
 * [DEPENDS]: import.meta.env
 * [POS]: Console API base URL 统一配置
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
const normalizeApiOrigin = (value: string) => value.replace(/\/+$/, '');

/**
 * 生产环境默认走 `https://server.anyhunt.app`，避免误走 console 同源 `/api/v1/*`。
 * 本地开发默认走空字符串，让 Vite proxy 代理 `/api/*` 到后端。
 */
export const API_BASE_URL = (() => {
  const explicit = (import.meta.env.VITE_API_URL ?? '').trim();
  if (explicit) {
    return normalizeApiOrigin(explicit);
  }
  return import.meta.env.DEV ? '' : 'https://server.anyhunt.app';
})();
