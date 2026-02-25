/**
 * [PROVIDES]: 函数式 apiClient, ApiError
 * [DEPENDS]: @anyhunt/api/client, auth-methods
 * [POS]: Console API 请求统一封装（bearer + 401 单次重试）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import {
  createApiClient,
  createApiTransport,
  type ApiClientRequestOptions,
  type QueryParams,
  ServerApiError,
} from '@anyhunt/api/client';
import { API_BASE_URL } from './api-base';
import { authMethods } from './auth/auth-methods';
import { getAccessToken } from '@/stores/auth';

export { ServerApiError as ApiError };

const resolvedBaseUrl =
  API_BASE_URL || (typeof window === 'undefined' ? 'http://localhost' : window.location.origin);

const coreClient = createApiClient({
  transport: createApiTransport({
    baseUrl: resolvedBaseUrl,
  }),
  defaultAuthMode: 'bearer',
  getAccessToken: () => getAccessToken(),
  onUnauthorized: async () => {
    const refreshed = await authMethods.refreshAccessToken();
    if (!refreshed) {
      await authMethods.logout();
    }
    return refreshed;
  },
});

interface JsonRequestOptions {
  headers?: HeadersInit;
  query?: QueryParams;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const toRequestOptions = (
  options?: JsonRequestOptions & { body?: unknown; method?: ApiClientRequestOptions['method'] }
): ApiClientRequestOptions => ({
  headers: options?.headers,
  query: options?.query,
  signal: options?.signal,
  timeoutMs: options?.timeoutMs,
  body: options?.body,
  method: options?.method,
});

export const apiClient = {
  get<T>(endpoint: string, options?: JsonRequestOptions): Promise<T> {
    return coreClient.get<T>(endpoint, toRequestOptions(options));
  },

  post<T>(endpoint: string, data?: unknown, options?: JsonRequestOptions): Promise<T> {
    return coreClient.post<T>(endpoint, toRequestOptions({ ...options, body: data }));
  },

  patch<T>(endpoint: string, data?: unknown, options?: JsonRequestOptions): Promise<T> {
    return coreClient.patch<T>(endpoint, toRequestOptions({ ...options, body: data }));
  },

  put<T>(endpoint: string, data?: unknown, options?: JsonRequestOptions): Promise<T> {
    return coreClient.put<T>(endpoint, toRequestOptions({ ...options, body: data }));
  },

  delete<T>(endpoint: string, options?: JsonRequestOptions): Promise<T> {
    return coreClient.del<T>(endpoint, toRequestOptions(options));
  },

  getBlob(endpoint: string, options?: JsonRequestOptions): Promise<Blob> {
    return coreClient.blob(endpoint, toRequestOptions(options));
  },

  postBlob(endpoint: string, data?: unknown, options?: JsonRequestOptions): Promise<Blob> {
    return coreClient.blob(endpoint, toRequestOptions({ ...options, body: data, method: 'POST' }));
  },

  raw(endpoint: string, options?: ApiClientRequestOptions): Promise<Response> {
    return coreClient.raw(endpoint, options);
  },

  stream(endpoint: string, options?: ApiClientRequestOptions): Promise<Response> {
    return coreClient.stream(endpoint, options);
  },
};
