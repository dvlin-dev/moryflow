/**
 * [PROVIDES]: Auth token 的请求解析工具
 * [DEPENDS]: 无
 * [POS]: AuthTokensController 的轻量辅助函数
 */

import type { Request } from 'express';
import {
  DEVICE_PLATFORM_ALLOWLIST,
  DEVICE_PLATFORM_HEADER,
} from './auth.constants';

export const parseCookieHeader = (
  cookieHeader?: string,
): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const index = part.indexOf('=');
      if (index === -1) {
        return acc;
      }
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      if (!key) {
        return acc;
      }
      try {
        acc[key] = decodeURIComponent(value);
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
};

export const getRequestOrigin = (req: Request): string | undefined => {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.trim()) {
    return origin.trim();
  }
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export const getDevicePlatform = (req: Request): string | null => {
  const headerValue = req.headers[DEVICE_PLATFORM_HEADER];
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!value || typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return DEVICE_PLATFORM_ALLOWLIST.has(normalized) ? normalized : null;
};
