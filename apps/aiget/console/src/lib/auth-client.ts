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
  return import.meta.env.DEV ? '' : 'https://aiget.dev';
};

const resolveAuthBaseUrl = () => {
  const explicit = import.meta.env.VITE_AUTH_URL;
  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  const normalized = resolveApiOrigin();
  if (!normalized) {
    return '/api/v1/auth';
  }
  if (normalized.endsWith('/api/v1/auth')) {
    return normalized;
  }

  return `${normalized}/api/v1/auth`;
};

export const authClient = createAuthClient({
  baseUrl: resolveAuthBaseUrl(),
  clientType: 'web',
});
