/**
 * [DEFINES]: AUTH_COOKIE_NAME, TOKEN_TTL, CLIENT_TYPE_HEADER 等常量
 * [USED_BY]: better-auth.ts, facade/*.ts, guards/*.ts
 * [POS]: auth-server 包的常量定义
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

/**
 * Better Auth session cookie 名称
 */
export const AUTH_COOKIE_NAME = 'better-auth.session_token';

/**
 * Access Token TTL（6 小时）
 */
export const ACCESS_TOKEN_TTL = '6h';

/**
 * Session TTL（90 天，秒）
 */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;

/**
 * Session 更新周期（1 天，秒）
 */
export const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

/**
 * 客户端类型 Header
 */
export const CLIENT_TYPE_HEADER = 'x-client-type';

/**
 * 客户端类型枚举
 */
export const ClientType = {
  WEB: 'web',
  NATIVE: 'native',
} as const;

export type ClientType = (typeof ClientType)[keyof typeof ClientType];

/**
 * 跨子域 Cookie 域名
 */
export const COOKIE_DOMAIN =
  process.env.COOKIE_DOMAIN ?? (process.env.NODE_ENV === 'production' ? '.aiget.dev' : undefined);

/**
 * JWT 配置
 */
export const JWT_CONFIG = {
  issuer: 'https://server.aiget.dev',
  audience: 'https://server.aiget.dev',
  expirationTime: ACCESS_TOKEN_TTL,
} as const;

/**
 * Email OTP 配置
 */
export const EMAIL_OTP_CONFIG = {
  otpLength: 6,
  expiresIn: 300, // 5 分钟
  allowedAttempts: 3,
} as const;

/**
 * 信任的子域名（生产环境应从环境变量读取）
 */
export const DEFAULT_TRUSTED_ORIGINS = [
  'https://aiget.dev',
  'https://server.aiget.dev',
  'https://console.aiget.dev',
  'https://admin.aiget.dev',
  // 开发环境
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
];
