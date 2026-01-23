/**
 * [PROVIDES]: API_BASE_URL
 * [DEPENDS]: import.meta.env
 * [POS]: www API 基础地址解析（与 Auth/业务 API 共享）
 */

const normalizeApiOrigin = (value: string) => value.replace(/\/+$/, '');

/**
 * API base URL
 * - Dev: empty string (use Vite proxy)
 * - Prod: https://server.anyhunt.app
 */
export const API_BASE_URL = (() => {
  const explicit = (import.meta.env.VITE_API_URL ?? '').trim();
  if (explicit) {
    return normalizeApiOrigin(explicit);
  }
  return import.meta.env.DEV ? '' : 'https://server.anyhunt.app';
})();
