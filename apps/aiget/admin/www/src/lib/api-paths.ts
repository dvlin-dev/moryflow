/**
 * Admin API 路径常量
 */

export const AUTH_API = {
  SIGN_IN: '/api/auth/sign-in/email',
  SIGN_OUT: '/api/auth/sign-out',
  SESSION: '/api/auth/get-session',
} as const;

export const ADMIN_API = {
  LOGIN: '/api/v1/admin/login',
  LOGOUT: '/api/v1/admin/logout',
  USERS: '/api/v1/admin/users',
  SUBSCRIPTIONS: '/api/v1/admin/subscriptions',
  ORDERS: '/api/v1/admin/orders',
  DASHBOARD: '/api/v1/admin/dashboard',
  JOBS: '/api/v1/admin/jobs',
  QUEUES: '/api/v1/admin/queues',
  BROWSER: '/api/v1/admin/browser',
} as const;
