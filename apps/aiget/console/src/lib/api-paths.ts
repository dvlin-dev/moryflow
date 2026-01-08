/**
 * [DEFINES]: CONSOLE_API, USER_API, PAYMENT_API, PUBLIC_API, HEALTH_API
 * [USED_BY]: features/*, lib/api-client
 * [POS]: Console API 路径常量定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

export const USER_API = {
  ME: '/api/v1/user/me',
} as const;

export const PAYMENT_API = {
  SUBSCRIPTION: '/api/v1/payment/subscription',
  QUOTA: '/api/v1/payment/quota',
} as const;

export const CONSOLE_API = {
  API_KEYS: '/api/v1/console/api-keys',
  SCREENSHOTS: '/api/v1/console/screenshots',
  WEBHOOKS: '/api/v1/console/webhooks',
  STATS: '/api/v1/console/stats',
  SCREENSHOT: '/api/v1/console/screenshot',
  OEMBED: '/api/v1/console/oembed',
} as const;

export const PUBLIC_API = {
  SCREENSHOT: '/api/v1/screenshot',
  QUOTA: '/api/v1/quota',
} as const;

export const HEALTH_API = {
  BASE: '/health',
} as const;
