/**
 * API 路径常量
 * 统一管理所有 API 端点，供前后端共用
 */

// ── API 基础 URL ──────────────────────────────────────────

/** 会员服务 API 基础 URL */
export const MEMBERSHIP_API_URL = 'https://server.moryflow.com'

// ── 认证模块 ──────────────────────────────────────────────

export const AUTH_API = {
  BASE: '/api/auth',
  SIGN_IN_EMAIL: '/api/auth/sign-in/email',
  SIGN_UP_EMAIL: '/api/auth/sign-up/email',
  SIGN_OUT: '/api/auth/sign-out',
  GET_SESSION: '/api/auth/get-session',
} as const

// ── 用户模块（当前登录用户） ──────────────────────────────

export const USER_API = {
  BASE: '/api/user',
  ME: '/api/user/me',
  CREDITS: '/api/user/credits',
  PROFILE: '/api/user/profile',
  DELETE_ACCOUNT: '/api/user/account',
} as const

// ── OpenAI 兼容 API（保持 /v1 前缀） ─────────────────────

export const OPENAI_API = {
  BASE: '/v1',
  MODELS: '/v1/models',
  CHAT_COMPLETIONS: '/v1/chat/completions',
} as const

// ── 管理后台 ──────────────────────────────────────────────

export const ADMIN_API = {
  BASE: '/api/admin',
  LOGIN: '/api/admin/login',
  STATS: '/api/admin/stats',
  LOGS: '/api/admin/logs',
  USERS: '/api/admin/users',
  AI_MODELS: '/api/admin/ai/models',
  AI_PROVIDERS: '/api/admin/ai/providers',
  AI_PRESET_PROVIDERS: '/api/admin/ai/preset-providers',
  CHAT_COMPLETIONS: '/api/admin/chat/completions',
  PAYMENT: '/api/admin/payment',
} as const

// ── License 模块 ──────────────────────────────────────────

export const LICENSE_API = {
  BASE: '/license',
  VALIDATE: '/license/validate',
  ACTIVATE: '/license/activate',
  DEACTIVATE: '/license/deactivate',
} as const

// ── 支付模块 ──────────────────────────────────────────────

export const PAYMENT_API = {
  BASE: '/api/payment',
  WEBHOOK: '/api/payment/webhook',
  CHECKOUT: '/api/payment/checkout',
  PORTAL: '/api/payment/portal',
  PRODUCTS: '/api/payment/products',
} as const

// ── 健康检查 ──────────────────────────────────────────────

export const HEALTH_API = {
  BASE: '/health',
  READY: '/health/ready',
  LIVE: '/health/live',
} as const

// ── 聚合导出 ──────────────────────────────────────────────

export const API = {
  AUTH: AUTH_API,
  USER: USER_API,
  OPENAI: OPENAI_API,
  ADMIN: ADMIN_API,
  LICENSE: LICENSE_API,
  PAYMENT: PAYMENT_API,
  HEALTH: HEALTH_API,
} as const

export type ApiPaths = typeof API
