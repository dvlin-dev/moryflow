/**
 * [PROVIDES]: createApiTransport - 纯传输层（URL/query/body/timeout/response 解析）
 * [DEPENDS]: error.ts, types.ts
 * [POS]: 函数式 API 客户端底层，不包含认证语义
 * [UPDATE]: 2026-02-25 - 错误响应支持 text/plain body 与 JSON 字符串兜底解析
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { ProblemDetails } from '@moryflow/types';
import { ServerApiError } from './error';
import type {
  ApiBody,
  ApiTransport,
  ApiTransportConfig,
  QueryParams,
  TransportRequest,
} from './types';

const isJsonContentType = (contentType: string): boolean =>
  contentType.includes('application/json') ||
  contentType.includes('application/problem+json') ||
  contentType.includes('+json');

const appendQuery = (url: URL, query?: QueryParams) => {
  if (!query) return;

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) continue;
        url.searchParams.append(key, String(item));
      }
      continue;
    }

    if (value === null || value === undefined) continue;
    url.searchParams.set(key, String(value));
  }
};

const isBinaryLikeBody = (
  body: ApiBody
): body is FormData | Blob | URLSearchParams | ArrayBuffer | ArrayBufferView | string =>
  typeof body === 'string' ||
  body instanceof FormData ||
  body instanceof Blob ||
  body instanceof URLSearchParams ||
  body instanceof ArrayBuffer ||
  ArrayBuffer.isView(body);

const buildRequestBody = (body: ApiBody, headers: Headers): BodyInit | undefined => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (isBinaryLikeBody(body)) {
    return body as BodyInit;
  }

  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return JSON.stringify(body);
};

const mergeSignal = (externalSignal: AbortSignal | undefined, timeoutMs: number | undefined) => {
  if (!timeoutMs || timeoutMs <= 0) {
    return { signal: externalSignal, cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const abortByExternal = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', abortByExternal, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortByExternal);
    },
  };
};

const parseJsonSafe = async (response: Response): Promise<{ ok: boolean; value: unknown }> => {
  try {
    return { ok: true, value: await response.json() };
  } catch {
    return { ok: false, value: undefined };
  }
};

const parseTextSafe = async (response: Response): Promise<string | undefined> => {
  try {
    return await response.text();
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const parseJsonStringSafe = (value: string): unknown | undefined => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const toApiError = (status: number, payload: unknown, requestId?: string): ServerApiError => {
  const textPayload = readNonEmptyString(payload);
  const parsedPayload = textPayload !== null ? parseJsonStringSafe(textPayload) : undefined;
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

  return new ServerApiError(status, message, code, problem?.details, resolvedRequestId, errors);
};

export function createApiTransport(config: ApiTransportConfig): ApiTransport {
  const { baseUrl, fetcher = fetch, defaultHeaders, timeoutMs: defaultTimeoutMs } = config;
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const request: ApiTransport['request'] = async <T>(req: TransportRequest): Promise<T> => {
    const url = new URL(req.path, normalizedBaseUrl);
    appendQuery(url, req.query);

    const headers = new Headers(defaultHeaders);
    if (req.headers) {
      const incoming = new Headers(req.headers);
      incoming.forEach((value, key) => headers.set(key, value));
    }

    const body = buildRequestBody(req.body, headers);
    const { signal, cleanup } = mergeSignal(req.signal, req.timeoutMs ?? defaultTimeoutMs);

    const responseType = req.responseType ?? 'json';

    try {
      const response = await fetcher(url.toString(), {
        method: req.method ?? 'GET',
        headers,
        body,
        signal,
        redirect: req.redirect,
      });

      if (responseType === 'raw' || responseType === 'stream') {
        return response as T;
      }

      const requestId = response.headers.get('x-request-id') ?? undefined;
      const contentType = response.headers.get('content-type') ?? '';
      const isJson = isJsonContentType(contentType);

      if (!response.ok) {
        let payload: unknown = undefined;
        if (isJson) {
          const parsed = await parseJsonSafe(response.clone());
          if (parsed.ok) {
            payload = parsed.value;
          }
        }
        if (payload === undefined) {
          payload = await parseTextSafe(response.clone());
        }
        throw toApiError(response.status, payload, requestId);
      }

      if (responseType === 'blob') {
        return (await response.blob()) as T;
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const parsed = isJson ? await parseJsonSafe(response) : { ok: false, value: undefined };

      if (!isJson || !parsed.ok) {
        throw new ServerApiError(
          response.status,
          'Unexpected response format',
          'UNEXPECTED_RESPONSE',
          undefined,
          requestId
        );
      }

      return parsed.value as T;
    } finally {
      cleanup();
    }
  };

  return { request };
}
