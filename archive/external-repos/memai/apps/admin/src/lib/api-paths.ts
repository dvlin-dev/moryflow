/**
 * Admin API 路径常量
 */

export const AUTH_API = {
  SIGN_IN: '/api/auth/sign-in/email',
  SIGN_OUT: '/api/auth/sign-out',
  SESSION: '/api/auth/get-session',
} as const;

export const ADMIN_API = {
  USERS: '/api/admin/users',
  SUBSCRIPTIONS: '/api/admin/subscriptions',
  ORDERS: '/api/admin/orders',
  DASHBOARD: '/api/admin/dashboard',
} as const;
