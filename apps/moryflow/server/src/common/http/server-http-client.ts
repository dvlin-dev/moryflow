/**
 * [PROVIDES]: serverHttpJson/serverHttpRaw - 统一出站 HTTP 请求函数（函数式）
 * [DEPENDS]: @moryflow/api transport
 * [POS]: Moryflow Server 出站请求统一入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import {
  createApiTransport,
  ServerApiError,
  type ApiClientRequestOptions,
  type ApiTransport,
  type ResponseType,
} from '@moryflow/api';

const TRANSPORT_BASE_URL = 'http://localhost';

type ServerRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const createTransport = (fetcher: typeof fetch): ApiTransport =>
  createApiTransport({
    baseUrl: TRANSPORT_BASE_URL,
    fetcher,
  });

export interface ServerHttpRequest {
  url: string;
  method?: ServerRequestMethod;
  headers?: HeadersInit;
  body?: ApiClientRequestOptions['body'];
  signal?: AbortSignal;
  timeoutMs?: number;
  redirect?: RequestRedirect;
  responseType?: ResponseType;
  fetcher?: typeof fetch;
}

export async function serverHttpRequest<T>(
  request: ServerHttpRequest,
): Promise<T> {
  const fetcher = request.fetcher ?? globalThis.fetch;
  const transport = createTransport(fetcher);

  return transport.request<T>({
    path: request.url,
    method: request.method ?? 'GET',
    headers: request.headers,
    body: request.body,
    signal: request.signal,
    timeoutMs: request.timeoutMs,
    redirect: request.redirect,
    responseType: request.responseType ?? 'json',
  });
}

export async function serverHttpJson<T>(
  request: Omit<ServerHttpRequest, 'responseType'>,
): Promise<T> {
  return serverHttpRequest<T>({ ...request, responseType: 'json' });
}

export async function serverHttpRaw(
  request: Omit<ServerHttpRequest, 'responseType'>,
): Promise<Response> {
  return serverHttpRequest<Response>({ ...request, responseType: 'raw' });
}

export { ServerApiError };
