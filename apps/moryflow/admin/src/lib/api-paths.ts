/**
 * API 路径常量（Admin 本地定义）
 *
 * 由于 admin 是 submodule 的一部分，无法直接使用 @moryflow/shared-api
 * 这里定义 admin 需要的路径常量，与主项目保持一致
 */

export const ADMIN_API = {
  BASE: '/api/v1/admin',
  ME: '/api/v1/admin/me',
  STATS: '/api/v1/admin/stats',
  LOGS: '/api/v1/admin/logs',
  USERS: '/api/v1/admin/users',
  PAYMENT: '/api/v1/admin/payment',
  EMAIL: '/api/v1/admin/email',
  AI_MODELS: '/api/v1/admin/ai/models',
  AI_PROVIDERS: '/api/v1/admin/ai/providers',
  AI_PRESET_PROVIDERS: '/api/v1/admin/ai/preset-providers',
} as const;

/** AI Proxy API 路径 (OpenAI 兼容) */
export const AI_PROXY_API = {
  CHAT_COMPLETIONS: '/v1/chat/completions',
  IMAGES_GENERATIONS: '/v1/images/generations',
  MODELS: '/v1/models',
} as const;

export const HEALTH_API = {
  BASE: '/health',
} as const;
