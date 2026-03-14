/**
 * [PROVIDES]: Auth 请求上下文判定（browser vs device token-first）
 * [DEPENDS]: Express Request，auth.tokens.utils
 * [POS]: Auth/CORS 共享上下文事实源
 */

import type { Request } from 'express';
import { getDevicePlatform } from './auth.tokens.utils';

export const DEVICE_TOKEN_AUTH_PATHS = new Set([
  '/api/v1/auth/sign-in/email',
  '/api/v1/auth/email-otp/verify-email',
  '/api/v1/auth/sign-up/email/complete',
  '/api/v1/auth/social/google/exchange',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/sign-out',
]);

export const BETTER_AUTH_TOKEN_FIRST_PATHS = new Set([
  '/api/v1/auth/sign-in/email',
  '/api/v1/auth/email-otp/verify-email',
]);

export const BROWSER_CONTEXT_HEADER_NAMES = [
  'origin',
  'referer',
  'cookie',
] as const;

export const normalizeAuthPathname = (value: string): string => {
  try {
    const parsed = new URL(value, 'http://localhost');
    return parsed.pathname.replace(/\/+$/, '');
  } catch {
    return value.split('?')[0]?.replace(/\/+$/, '') ?? value;
  }
};

export const isDevicePlatformRequest = (req: Request): boolean =>
  getDevicePlatform(req) !== null;

export const isDeviceTokenAuthPath = (value: string): boolean =>
  DEVICE_TOKEN_AUTH_PATHS.has(normalizeAuthPathname(value));

export const isBetterAuthTokenFirstPath = (value: string): boolean =>
  BETTER_AUTH_TOKEN_FIRST_PATHS.has(normalizeAuthPathname(value));

export const shouldIgnoreBrowserContextForAuthRequest = (
  req: Request,
): boolean =>
  isDevicePlatformRequest(req) && isDeviceTokenAuthPath(req.originalUrl);

export const stripBrowserContextHeadersFromRequest = (req: Request): void => {
  if (!shouldIgnoreBrowserContextForAuthRequest(req)) {
    return;
  }

  for (const header of BROWSER_CONTEXT_HEADER_NAMES) {
    delete req.headers[header];
  }
};
