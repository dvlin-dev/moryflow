/**
 * [DEFINES]: CONSOLE_API, USER_API, PAYMENT_API, FETCHX_API, MEMOX_API, HEALTH_API, QUOTA_API
 * [USED_BY]: features/*, lib/api-client
 * [POS]: Console API 路径常量定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

// 用户 API
export const USER_API = {
  ME: '/api/v1/app/user/me',
} as const;

// 支付 API
export const PAYMENT_API = {
  SUBSCRIPTION: '/api/v1/app/payment/subscription',
  QUOTA: '/api/v1/app/payment/quota',
} as const;

// App 管理 API（Session 认证）
export const CONSOLE_API = {
  API_KEYS: '/api/v1/app/api-keys',
} as const;

// Webhook API（API Key 认证）
export const WEBHOOK_API = {
  WEBHOOKS: '/api/v1/webhooks',
} as const;

// oEmbed API（API Key 认证）
export const OEMBED_API = {
  BASE: '/api/v1/oembed',
} as const;

// Fetchx 核心 API（API Key 认证）
export const FETCHX_API = {
  SCRAPE: '/api/v1/scrape',
  CRAWL: '/api/v1/crawl',
  MAP: '/api/v1/map',
  EXTRACT: '/api/v1/extract',
  SEARCH: '/api/v1/search',
  BATCH_SCRAPE: '/api/v1/batch/scrape',
} as const;

// Memox API（API Key 认证）
export const MEMOX_API = {
  MEMORIES: '/api/v1/memories',
  MEMORIES_SEARCH: '/api/v1/memories/search',
  MEMORIES_BATCH: '/api/v1/batch',
  MEMORIES_BY_ENTITY: '/api/v1/memories',
  ENTITIES: '/api/v1/entities',
  ENTITY_FILTERS: '/api/v1/entities/filters',
  USERS: '/api/v1/users',
  AGENTS: '/api/v1/agents',
  APPS: '/api/v1/apps',
  RUNS: '/api/v1/runs',
  FEEDBACK: '/api/v1/feedback',
  EXPORTS: '/api/v1/exports',
  EXPORTS_GET: '/api/v1/exports/get',
} as const;

// Agent API（API Key 认证）
export const AGENT_API = {
  BASE: '/api/v1/agent',
  ESTIMATE: '/api/v1/agent/estimate',
  MODELS: '/api/v1/agent/models',
} as const;

// Browser API（API Key 认证）
export const BROWSER_API = {
  SESSION: '/api/v1/browser/session',
  CDP_CONNECT: '/api/v1/browser/session/cdp/connect',
} as const;

// 健康检查
export const HEALTH_API = {
  BASE: '/health',
} as const;

// 配额 API
export const QUOTA_API = {
  STATUS: '/api/v1/quota',
} as const;
