/**
 * [DEFINES]: ADMIN_API, USER_API
 * [USED_BY]: features/*, lib/api-client
 * [POS]: Admin API 路径常量定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

export const ADMIN_API = {
  USERS: '/api/v1/admin/users',
  SUBSCRIPTIONS: '/api/v1/admin/subscriptions',
  ORDERS: '/api/v1/admin/orders',
  DASHBOARD: '/api/v1/admin/dashboard',
  JOBS: '/api/v1/admin/jobs',
  QUEUES: '/api/v1/admin/queues',
  VIDEO_TRANSCRIPTS: '/api/v1/admin/video-transcripts',
  BROWSER: '/api/v1/admin/browser',
  // LLM
  LLM_SETTINGS: '/api/v1/admin/llm/settings',
  LLM_PROVIDERS: '/api/v1/admin/llm/providers',
  LLM_PROVIDER_PRESETS: '/api/v1/admin/llm/providers/presets',
  LLM_MODELS: '/api/v1/admin/llm/models',
  // Digest
  DIGEST_REPORTS: '/api/v1/admin/digest/reports',
  DIGEST_STATS: '/api/v1/admin/digest/stats',
  DIGEST_TOPICS: '/api/v1/admin/digest/topics',
  DIGEST_WELCOME: '/api/v1/admin/digest/welcome',
  DIGEST_WELCOME_PAGES: '/api/v1/admin/digest/welcome/pages',
} as const;

export const USER_API = {
  ME: '/api/v1/app/user/me',
} as const;
