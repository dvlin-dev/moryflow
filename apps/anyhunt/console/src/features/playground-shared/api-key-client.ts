/**
 * [PROVIDES]: createApiKeyClient - API Key 认证请求封装（函数式）
 * [DEPENDS]: @anyhunt/api/client, @/lib/api-base
 * [POS]: Console 调用公网 API 的基础客户端
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import {
  createApiClient,
  createApiTransport,
  ServerApiError,
  type ApiClientRequestOptions,
} from '@anyhunt/api/client';
import { API_BASE_URL } from '@/lib/api-base';

export interface ApiKeyClientOptions {
  apiKey: string;
  timeout?: number;
}

export interface ApiKeyClient {
  get<T>(endpoint: string): Promise<T>;
  post<T>(endpoint: string, body?: unknown): Promise<T>;
  put<T>(endpoint: string, body?: unknown): Promise<T>;
  patch<T>(endpoint: string, body?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

export class ApiKeyClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiKeyClientError';
    this.status = status;
    this.code = code || 'ERROR';
  }
}

const toBody = (body: unknown): ApiClientRequestOptions['body'] =>
  body as ApiClientRequestOptions['body'];

const resolveBaseUrl = (): string => {
  const explicit = API_BASE_URL.trim();
  if (explicit) {
    return explicit;
  }

  if (typeof window !== 'undefined') {
    const origin = window.location?.origin?.trim();
    if (origin && origin !== 'null') {
      return origin;
    }
  }

  return 'http://localhost';
};

const wrapServerError = (error: unknown): never => {
  if (error instanceof ApiKeyClientError) {
    throw error;
  }

  if (error instanceof ServerApiError) {
    throw new ApiKeyClientError(error.message, error.status, error.code);
  }

  if (error instanceof Error && error.name === 'AbortError') {
    throw new ApiKeyClientError('Request timeout', 408, 'TIMEOUT');
  }

  throw new ApiKeyClientError(
    error instanceof Error ? error.message : 'Unknown error',
    500,
    'UNKNOWN'
  );
};

export function createApiKeyClient(options: ApiKeyClientOptions): ApiKeyClient {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new ApiKeyClientError('API key is required', 400, 'MISSING_API_KEY');
  }

  const client = createApiClient({
    transport: createApiTransport({
      baseUrl: resolveBaseUrl(),
      timeoutMs: options.timeout || 60_000,
    }),
    defaultAuthMode: 'apiKey',
    getApiKey: () => apiKey,
  });

  return {
    async get<T>(endpoint: string): Promise<T> {
      try {
        return await client.get<T>(endpoint);
      } catch (error) {
        wrapServerError(error);
      }
    },

    async post<T>(endpoint: string, body?: unknown): Promise<T> {
      try {
        return await client.post<T>(endpoint, { body: toBody(body) });
      } catch (error) {
        wrapServerError(error);
      }
    },

    async put<T>(endpoint: string, body?: unknown): Promise<T> {
      try {
        return await client.put<T>(endpoint, { body: toBody(body) });
      } catch (error) {
        wrapServerError(error);
      }
    },

    async patch<T>(endpoint: string, body?: unknown): Promise<T> {
      try {
        return await client.patch<T>(endpoint, { body: toBody(body) });
      } catch (error) {
        wrapServerError(error);
      }
    },

    async delete<T>(endpoint: string): Promise<T> {
      try {
        return await client.del<T>(endpoint);
      } catch (error) {
        wrapServerError(error);
      }
    },
  };
}
