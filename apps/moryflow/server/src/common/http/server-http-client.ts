/**
 * [PROVIDES]: serverHttpJson/serverHttpRaw - 统一出站 HTTP 请求函数（函数式）
 * [DEPENDS]: @moryflow/api transport
 * [POS]: Moryflow Server 出站请求统一入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import {
  createApiTransport,
  ServerApiError,
  type ApiClientRequestOptions,
  type ApiTransport,
  type ResponseType,
} from '@moryflow/api';
import type { ProblemDetails } from '../utils/problem-details';

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

const isJsonContentType = (contentType: string): boolean =>
  contentType.includes('application/json') ||
  contentType.includes('application/problem+json') ||
  contentType.includes('+json');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const parseJsonStringSafe = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const toServerApiError = (
  status: number,
  payload: unknown,
  requestId?: string,
): ServerApiError => {
  const textPayload = readNonEmptyString(payload);
  const parsedPayload =
    textPayload !== null ? parseJsonStringSafe(textPayload) : undefined;
  const problem = isRecord(parsedPayload)
    ? (parsedPayload as ProblemDetails & Record<string, unknown>)
    : isRecord(payload)
      ? (payload as ProblemDetails & Record<string, unknown>)
      : null;
  const message =
    readNonEmptyString(problem?.detail) ??
    readNonEmptyString(problem?.message) ??
    readNonEmptyString(problem?.title) ??
    textPayload ??
    `Request failed (${status})`;
  const code = readNonEmptyString(problem?.code) ?? 'UNKNOWN_ERROR';
  const resolvedRequestId = readNonEmptyString(problem?.requestId) ?? requestId;
  const errors = Array.isArray(problem?.errors)
    ? (problem.errors as Array<{ field?: string; message: string }>)
    : undefined;

  return new ServerApiError(
    status,
    message,
    code,
    problem?.details,
    resolvedRequestId,
    errors,
  );
};

export async function serverHttpVoid(
  request: Omit<ServerHttpRequest, 'responseType'>,
): Promise<void> {
  const response = await serverHttpRaw(request);
  if (response.ok) {
    return;
  }

  const requestId = response.headers.get('x-request-id') ?? undefined;
  const contentType = response.headers.get('content-type') ?? '';
  let payload: unknown = undefined;

  if (isJsonContentType(contentType)) {
    try {
      payload = await response.clone().json();
    } catch {
      payload = undefined;
    }
  }

  if (payload === undefined) {
    try {
      payload = await response.clone().text();
    } catch {
      payload = undefined;
    }
  }

  throw toServerApiError(response.status, payload, requestId);
}

export { ServerApiError };
