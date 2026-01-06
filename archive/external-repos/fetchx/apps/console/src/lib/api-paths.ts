/**
 * Aiget API 路径常量
 */

export const AUTH_API = {
  SIGN_IN: '/api/auth/sign-in/email',
  SIGN_UP: '/api/auth/sign-up/email',
  SIGN_OUT: '/api/auth/sign-out',
  SESSION: '/api/auth/get-session',
} as const

export const USER_API = {
  ME: '/api/v1/user/me',
} as const

export const PAYMENT_API = {
  SUBSCRIPTION: '/api/v1/payment/subscription',
  QUOTA: '/api/v1/payment/quota',
} as const

export const CONSOLE_API = {
  API_KEYS: '/api/v1/console/api-keys',
  SCREENSHOTS: '/api/v1/console/screenshots',
  WEBHOOKS: '/api/v1/console/webhooks',
  STATS: '/api/v1/console/stats',
  SCREENSHOT: '/api/v1/console/screenshot',
  OEMBED: '/api/v1/console/oembed',
} as const

export const PUBLIC_API = {
  SCREENSHOT: '/api/v1/screenshot',
  QUOTA: '/api/v1/quota',
} as const

export const HEALTH_API = {
  BASE: '/health',
} as const

export const ADMIN_API = {
  LOGIN: '/api/v1/admin/login',
  LOGOUT: '/api/v1/admin/logout',
} as const
