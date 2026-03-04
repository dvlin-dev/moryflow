/**
 * [PROVIDES]: Better Auth handler 的 Request/Response 适配
 * [DEPENDS]: Express Request/Response
 * [POS]: AuthController/AuthTokensController 共享适配工具
 */

import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

type BuildAuthRequestOptions = {
  path?: string;
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
  includeRequestHeaders?: boolean;
};

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

const normalizeBody = (value: unknown): BodyInit | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return value as BodyInit;
  }
  return undefined;
};

const copyRequestHeaders = (
  req: ExpressRequest,
  overrides?: HeadersInit,
): Headers => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
    }
  }

  if (overrides) {
    new Headers(overrides).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
};

const collectSetCookies = (headers: HeadersWithSetCookie): string[] =>
  typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : headers.get('set-cookie')
      ? [headers.get('set-cookie') as string]
      : [];

export const appendAuthSetCookies = (
  res: ExpressResponse,
  headers: Headers,
): void => {
  const authHeaders = headers as HeadersWithSetCookie;
  const existingSetCookie = res.getHeader('set-cookie');
  const existingCookies = Array.isArray(existingSetCookie)
    ? existingSetCookie.map(String)
    : existingSetCookie
      ? [String(existingSetCookie)]
      : [];

  const mergedCookies = [
    ...existingCookies,
    ...collectSetCookies(authHeaders),
  ].filter(Boolean);
  if (mergedCookies.length > 0) {
    res.setHeader('set-cookie', mergedCookies);
  }
};

export const buildAuthRequest = (
  req: ExpressRequest,
  options?: BuildAuthRequestOptions,
): Request => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const path = options?.path ?? req.originalUrl;
  const url = path.startsWith('http')
    ? path
    : `${origin}${path.startsWith('/') ? '' : '/'}${path}`;

  const method = options?.method ?? req.method;
  const hasBody = !['GET', 'HEAD'].includes(method);
  const fallbackBody =
    normalizeBody(req.rawBody) ??
    normalizeBody(req.body) ??
    (req.body ? JSON.stringify(req.body) : undefined);
  const body = hasBody ? (options?.body ?? fallbackBody) : undefined;
  const headers =
    options?.includeRequestHeaders === false
      ? new Headers(options?.headers)
      : copyRequestHeaders(req, options?.headers);

  return new Request(url, {
    method,
    headers,
    body,
  });
};

export const applyAuthResponse = async (
  res: ExpressResponse,
  response: Response,
): Promise<void> => {
  const headers = response.headers as HeadersWithSetCookie;

  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      return;
    }
    res.setHeader(key, value);
  });

  appendAuthSetCookies(res, headers);

  res.status(response.status);

  if (response.body) {
    const bodyText = await response.text();
    res.send(bodyText);
  } else {
    res.end();
  }
};
