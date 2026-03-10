/**
 * [PROVIDES]: API 路径常量与默认 API base
 * [DEPENDS]: 无
 * [POS]: 共享 API 路径定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// ── API 基础 URL ──────────────────────────────────────────

/** 会员服务 API 基础 URL */
export const MEMBERSHIP_API_URL = 'https://server.moryflow.com';

// ── 认证模块 ──────────────────────────────────────────────

export const AUTH_API = {
  BASE: '/api/v1/auth',
  SIGN_IN_EMAIL: '/api/v1/auth/sign-in/email',
  SIGN_IN_SOCIAL: '/api/v1/auth/sign-in/social',
  SIGN_UP_EMAIL: '/api/v1/auth/sign-up/email',
  SIGN_UP_EMAIL_START: '/api/v1/auth/sign-up/email/start',
  SIGN_UP_EMAIL_VERIFY_OTP: '/api/v1/auth/sign-up/email/verify-otp',
  SIGN_UP_EMAIL_COMPLETE: '/api/v1/auth/sign-up/email/complete',
  FORGOT_PASSWORD_EMAIL_OTP: '/api/v1/auth/forget-password/email-otp',
  EMAIL_OTP_RESET_PASSWORD: '/api/v1/auth/email-otp/reset-password',
  REFRESH: '/api/v1/auth/refresh',
  LOGOUT: '/api/v1/auth/logout',
  SIGN_OUT: '/api/v1/auth/sign-out',
  GET_SESSION: '/api/v1/auth/get-session',
  SOCIAL_GOOGLE_START: '/api/v1/auth/social/google/start',
  SOCIAL_GOOGLE_START_CHECK: '/api/v1/auth/social/google/start/check',
  SOCIAL_GOOGLE_BRIDGE_CALLBACK: '/api/v1/auth/social/google/bridge-callback',
  SOCIAL_GOOGLE_EXCHANGE: '/api/v1/auth/social/google/exchange',
} as const;

// ── 用户模块（当前登录用户） ──────────────────────────────

export const USER_API = {
  BASE: '/api/v1/user',
  ME: '/api/v1/user/me',
  CREDITS: '/api/v1/user/credits',
  PROFILE: '/api/v1/user/profile',
  DELETE_ACCOUNT: '/api/v1/user/account',
} as const;

// ── OpenAI 兼容 API（服务端统一挂在 /api/v1） ──────────────

export const OPENAI_API = {
  BASE: '/api/v1',
  MODELS: '/api/v1/models',
  CHAT_COMPLETIONS: '/api/v1/chat/completions',
} as const;

// ── 管理后台 ──────────────────────────────────────────────

export const ADMIN_API = {
  BASE: '/api/v1/admin',
  LOGIN: '/api/v1/admin/login',
  STATS: '/api/v1/admin/stats',
  LOGS: '/api/v1/admin/logs',
  USERS: '/api/v1/admin/users',
  AI_MODELS: '/api/v1/admin/ai/models',
  AI_PROVIDERS: '/api/v1/admin/ai/providers',
  AI_PRESET_PROVIDERS: '/api/v1/admin/ai/preset-providers',
  CHAT_COMPLETIONS: '/api/v1/admin/chat/completions',
  PAYMENT: '/api/v1/admin/payment',
} as const;

// ── 支付模块 ──────────────────────────────────────────────

export const PAYMENT_API = {
  BASE: '/api/v1/payment',
  WEBHOOK: '/api/v1/webhooks/creem',
  CHECKOUT: '/api/v1/payment/checkout',
  PORTAL: '/api/v1/payment/portal',
  PRODUCTS: '/api/v1/payment/products',
} as const;

// ── 健康检查 ──────────────────────────────────────────────

export const HEALTH_API = {
  BASE: '/health',
  READY: '/health/ready',
  LIVE: '/health/live',
} as const;

// ── 聚合导出 ──────────────────────────────────────────────

export const API = {
  AUTH: AUTH_API,
  USER: USER_API,
  OPENAI: OPENAI_API,
  ADMIN: ADMIN_API,
  PAYMENT: PAYMENT_API,
  HEALTH: HEALTH_API,
} as const;

export type ApiPaths = typeof API;
