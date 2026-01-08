/**
 * [PROVIDES]: authClient
 * [DEPENDS]: @aiget/auth-client, import.meta.env, VITE_API_URL/VITE_AUTH_URL
 * [POS]: Console 端 Auth SDK 初始化入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { createAuthClient } from '@aiget/auth-client';

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

const resolveApiOrigin = () => {
  const explicit = (import.meta.env.VITE_API_URL ?? '').trim();
  if (explicit) {
    return normalizeBaseUrl(explicit);
  }
  return import.meta.env.DEV ? '' : 'https://server.aiget.dev';
};

const resolveAuthBaseUrl = () => {
  const explicit = import.meta.env.VITE_AUTH_URL;
  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  // Better Auth 使用 /api/auth（不带版本号），因为它有自己的路由结构
  const normalized = resolveApiOrigin();
  if (!normalized) {
    return '/api/auth';
  }
  if (normalized.endsWith('/api/auth')) {
    return normalized;
  }

  return `${normalized}/api/auth`;
};

export const authClient = createAuthClient({
  baseUrl: resolveAuthBaseUrl(),
  clientType: 'web',
});
