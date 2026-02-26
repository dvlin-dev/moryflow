/**
 * [PROVIDES]: Browser API 客户端辅助方法（createClient/withQuery）
 * [DEPENDS]: ApiKeyClient
 * [POS]: Agent Browser Playground 浏览器域 API 公共辅助层
 */

import { createApiKeyClient } from '@/features/playground-shared/api-key-client';

export const withQuery = (endpoint: string, query: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  const queryString = params.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};

export const createClient = (apiKey: string) => createApiKeyClient({ apiKey });
