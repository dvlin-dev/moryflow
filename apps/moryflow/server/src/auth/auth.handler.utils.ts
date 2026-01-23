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

const copyRequestHeaders = (req: ExpressRequest): Headers => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
    }
  }
  return headers;
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

  return new Request(url, {
    method,
    headers: copyRequestHeaders(req),
    body,
  });
};

export const applyAuthResponse = async (
  res: ExpressResponse,
  response: Response,
): Promise<void> => {
  const headers = response.headers as HeadersWithSetCookie;
  const setCookies =
    typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];

  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      return;
    }
    res.setHeader(key, value);
  });

  const existingSetCookie = res.getHeader('set-cookie');
  const existingCookies = Array.isArray(existingSetCookie)
    ? existingSetCookie.map(String)
    : existingSetCookie
      ? [String(existingSetCookie)]
      : [];

  const incomingCookies =
    setCookies.length > 0
      ? setCookies
      : headers.get('set-cookie')
        ? [headers.get('set-cookie') as string]
        : [];

  const mergedCookies = [...existingCookies, ...incomingCookies].filter(
    Boolean,
  );
  if (mergedCookies.length > 0) {
    res.setHeader('set-cookie', mergedCookies);
  }

  res.status(response.status);

  if (response.body) {
    const bodyText = await response.text();
    res.send(bodyText);
  } else {
    res.end();
  }
};
