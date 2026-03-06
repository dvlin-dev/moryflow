/**
 * [PROVIDES]: apiClient, ApiClientError
 * [DEPENDS]: @moryflow/api/client, auth-methods
 * [POS]: www API client for authenticated requests (Bearer + refresh)
 */

import {
  createApiClient,
  createApiTransport,
  type ApiClientRequestOptions,
  type QueryParams,
  ServerApiError,
} from '@moryflow/api/client';
import { API_BASE_URL } from './api-base';
import { authMethods } from './auth/auth-methods';
import { authStore } from '@/stores/auth-store';

export { ServerApiError as ApiClientError };

const resolvedBaseUrl =
  API_BASE_URL || (typeof window === 'undefined' ? 'http://localhost' : window.location.origin);

const coreClient = createApiClient({
  transport: createApiTransport({
    baseUrl: resolvedBaseUrl,
  }),
  defaultAuthMode: 'bearer',
  getAccessToken: () => authStore.getState().accessToken,
  onUnauthorized: async () => {
    const refreshed = await authMethods.refreshAccessToken();
    if (!refreshed && !authStore.getState().refreshToken) {
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
  options?: JsonRequestOptions & {
    body?: unknown;
    method?: ApiClientRequestOptions['method'];
  }
): ApiClientRequestOptions => ({
  headers: options?.headers,
  query: options?.query,
  signal: options?.signal,
  timeoutMs: options?.timeoutMs,
  body: options?.body as ApiClientRequestOptions['body'],
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

  raw(endpoint: string, options?: ApiClientRequestOptions): Promise<Response> {
    return coreClient.raw(endpoint, options);
  },

  stream(endpoint: string, options?: ApiClientRequestOptions): Promise<Response> {
    return coreClient.stream(endpoint, options);
  },
};
