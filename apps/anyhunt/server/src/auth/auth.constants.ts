/**
 * [PROVIDES]: Auth token/cookie constants与平台约束
 * [DEPENDS]: Node.js 环境变量（NODE_ENV）
 * [POS]: Auth 配置与 Token 服务的共享常量
 */

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 6;
export const REFRESH_TOKEN_TTL_DAYS = 90;
export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

export const REFRESH_TOKEN_BYTES = 48;
export const REFRESH_TOKEN_COOKIE_NAME = 'ah_refresh_token';
export const REFRESH_TOKEN_COOKIE_PATH = '/api/v1/auth';

export const DEVICE_PLATFORM_HEADER = 'x-app-platform';
export const DEVICE_PLATFORM_ALLOWLIST = new Set([
  'ios',
  'android',
  'mobile',
  'desktop',
  'electron',
  'cli',
]);

export const JWT_KEY_ALGORITHM = 'EdDSA' as const;
export const JWT_KEY_CURVE = 'Ed25519' as const;

export const isProduction = process.env.NODE_ENV === 'production';
