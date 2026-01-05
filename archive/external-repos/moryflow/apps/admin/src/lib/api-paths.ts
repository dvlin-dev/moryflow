/**
 * API 路径常量（Admin 本地定义）
 *
 * 由于 admin 是 submodule 的一部分，无法直接使用 @moryflow/shared-api
 * 这里定义 admin 需要的路径常量，与主项目保持一致
 */

export const ADMIN_API = {
  BASE: '/api/admin',
  LOGIN: '/api/admin/login',
  LOGOUT: '/api/admin/logout',
  ME: '/api/admin/me',
  STATS: '/api/admin/stats',
  LOGS: '/api/admin/logs',
  USERS: '/api/admin/users',
  PAYMENT: '/api/admin/payment',
  EMAIL: '/api/admin/email',
  AI_MODELS: '/api/admin/ai/models',
  AI_PROVIDERS: '/api/admin/ai/providers',
  AI_PRESET_PROVIDERS: '/api/admin/ai/preset-providers',
} as const

/** AI Proxy API 路径 (OpenAI 兼容) */
export const AI_PROXY_API = {
  CHAT_COMPLETIONS: '/v1/chat/completions',
  IMAGES_GENERATIONS: '/v1/images/generations',
  MODELS: '/v1/models',
} as const

export const HEALTH_API = {
  BASE: '/health',
} as const
