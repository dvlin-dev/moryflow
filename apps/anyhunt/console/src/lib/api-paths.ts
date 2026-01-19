/**
 * [DEFINES]: CONSOLE_API, USER_API, PAYMENT_API, FETCHX_API, MEMOX_API, MEMOX_CONSOLE_API, HEALTH_API, QUOTA_API
 * [USED_BY]: features/*, lib/api-client
 * [POS]: Console API 路径常量定义
 */

// 用户 API
export const USER_API = {
  ME: '/api/v1/user/me',
} as const;

// 支付 API
export const PAYMENT_API = {
  SUBSCRIPTION: '/api/v1/payment/subscription',
  QUOTA: '/api/v1/payment/quota',
} as const;

// Console 管理 API（Session 认证）
export const CONSOLE_API = {
  API_KEYS: '/api/v1/console/api-keys',
  WEBHOOKS: '/api/v1/console/webhooks',
  OEMBED: '/api/v1/console/oembed',
} as const;

// Console Playground API（Session 认证，代理到实际服务）
export const CONSOLE_PLAYGROUND_API = {
  SCRAPE: '/api/v1/console/playground/scrape',
  CRAWL: '/api/v1/console/playground/crawl',
  MAP: '/api/v1/console/playground/map',
  EXTRACT: '/api/v1/console/playground/extract',
  SEARCH: '/api/v1/console/playground/search',
  BROWSER_SESSION: '/api/v1/console/playground/browser/session',
  BROWSER_CDP_CONNECT: '/api/v1/console/playground/browser/cdp/connect',
  AGENT: '/api/v1/console/playground/agent',
  AGENT_ESTIMATE: '/api/v1/console/playground/agent/estimate',
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
  ENTITIES: '/api/v1/entities',
  RELATIONS: '/api/v1/relations',
  GRAPH: '/api/v1/graph',
} as const;

// Memox Console API（Session 认证）
export const MEMOX_CONSOLE_API = {
  MEMORIES: '/api/v1/console/memories',
  ENTITIES: '/api/v1/console/entities',
} as const;

// 健康检查
export const HEALTH_API = {
  BASE: '/health',
} as const;

// 配额 API
export const QUOTA_API = {
  STATUS: '/api/v1/quota',
} as const;
