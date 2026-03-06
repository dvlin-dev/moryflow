/**
 * [PROVIDES]: createApiClient - 函数式请求客户端（认证适配层）
 * [DEPENDS]: transport.ts, types.ts
 * [POS]: 在纯传输层之上注入 bearer/apiKey/public 鉴权行为与 401 重试策略
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { ServerApiError } from './error';
import { createApiTransport } from './transport';
import type {
  ApiClient,
  ApiClientConfig,
  ApiClientRequestOptions,
  AuthMode,
  TransportRequest,
} from './types';

const withAuthHeaders = async (
  mode: AuthMode,
  options: ApiClientRequestOptions,
  config: Pick<ApiClientConfig, 'getAccessToken' | 'getApiKey'>
): Promise<Headers> => {
  const headers = new Headers(options.headers);

  if (mode === 'public') {
    return headers;
  }

  if (mode === 'apiKey') {
    const token = await config.getApiKey?.();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  }

  const token = await config.getAccessToken?.();
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  return headers;
};

export function createApiClient(config: ApiClientConfig): ApiClient {
  const transport =
    config.transport ??
    createApiTransport({
      baseUrl: config.baseUrl ?? '',
    });

  const execute = async <T>(
    method: TransportRequest['method'],
    path: string,
    options: ApiClientRequestOptions = {},
    attempt = 0
  ): Promise<T> => {
    const mode = options.authMode ?? config.defaultAuthMode ?? 'bearer';
    const headers = await withAuthHeaders(mode, options, config);

    try {
      return await transport.request<T>({
        path,
        method,
        headers,
        query: options.query,
        body: options.body,
        signal: options.signal,
        timeoutMs: options.timeoutMs,
        redirect: options.redirect,
      });
    } catch (error) {
      if (
        mode === 'bearer' &&
        error instanceof ServerApiError &&
        error.status === 401 &&
        attempt === 0 &&
        config.onUnauthorized
      ) {
        const canRetry = await config.onUnauthorized();
        if (canRetry) {
          return execute<T>(method, path, options, attempt + 1);
        }
      }

      throw error;
    }
  };

  const executeAs = async <T>(
    responseType: TransportRequest['responseType'],
    defaultMethod: TransportRequest['method'],
    path: string,
    options: ApiClientRequestOptions = {},
    attempt = 0
  ): Promise<T> => {
    const mode = options.authMode ?? config.defaultAuthMode ?? 'bearer';
    const headers = await withAuthHeaders(mode, options, config);
    const method = options.method ?? defaultMethod;

    try {
      return await transport.request<T>({
        path,
        method,
        headers,
        query: options.query,
        body: options.body,
        signal: options.signal,
        timeoutMs: options.timeoutMs,
        redirect: options.redirect,
        responseType,
      });
    } catch (error) {
      if (
        mode === 'bearer' &&
        error instanceof ServerApiError &&
        error.status === 401 &&
        attempt === 0 &&
        config.onUnauthorized
      ) {
        const canRetry = await config.onUnauthorized();
        if (canRetry) {
          return executeAs<T>(responseType, defaultMethod, path, options, attempt + 1);
        }
      }

      throw error;
    }
  };

  return {
    get: (path, options) => execute('GET', path, options),
    post: (path, options) => execute('POST', path, options),
    put: (path, options) => execute('PUT', path, options),
    patch: (path, options) => execute('PATCH', path, options),
    del: (path, options) => execute('DELETE', path, options),
    raw: (path, options) => executeAs<Response>('raw', 'GET', path, options),
    blob: (path, options) => executeAs<Blob>('blob', 'GET', path, options),
    stream: (path, options) => executeAs<Response>('stream', 'GET', path, options),
  };
}
