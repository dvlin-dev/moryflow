/**
 * [DEFINES]: API 客户端基类和工具
 * [USED_BY]: 所有产品客户端 SDK
 * [POS]: 统一 API 客户端工具
 */

import type { ApiResponse, ApiErrorResponse } from '@aiget/types';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(
  url: string,
  options: RequestInit & { apiKey?: string } = {}
): Promise<T> {
  const { apiKey, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  if (apiKey) {
    headers.set('Authorization', 'Bearer ' + apiKey);
  }
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    const errorData = data as ApiErrorResponse;
    throw new ApiError(errorData.error.code, errorData.error.message, errorData.error.details);
  }

  return (data as { success: true; data: T }).data;
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl, apiKey } = config;

  return {
    get: <T>(path: string) => fetchApi<T>(baseUrl + path, { method: 'GET', apiKey }),

    post: <T>(path: string, body: unknown) =>
      fetchApi<T>(baseUrl + path, { method: 'POST', apiKey, body: JSON.stringify(body) }),

    put: <T>(path: string, body: unknown) =>
      fetchApi<T>(baseUrl + path, { method: 'PUT', apiKey, body: JSON.stringify(body) }),

    delete: <T>(path: string) => fetchApi<T>(baseUrl + path, { method: 'DELETE', apiKey }),
  };
}
