/**
 * [PROVIDES]: getPublicApiClient
 * [DEPENDS]: @moryflow/api/client
 * [POS]: WWW 公共请求函数式客户端（public 模式）
 */

import { createApiClient, createApiTransport, type ApiClient } from '@moryflow/api/client';

const clientCache = new Map<string, ApiClient>();

const resolveBaseUrl = (apiUrl: string): string => {
  const normalized = apiUrl.trim().replace(/\/+$/, '');
  if (normalized) {
    return normalized;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost';
};

export const getPublicApiClient = (apiUrl: string): ApiClient => {
  const baseUrl = resolveBaseUrl(apiUrl);
  const cached = clientCache.get(baseUrl);
  if (cached) {
    return cached;
  }

  const client = createApiClient({
    transport: createApiTransport({
      baseUrl,
    }),
    defaultAuthMode: 'public',
  });

  clientCache.set(baseUrl, client);
  return client;
};
