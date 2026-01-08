/**
 * [DEFINES]: ADMIN_API
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
  BROWSER: '/api/v1/admin/browser',
} as const;
