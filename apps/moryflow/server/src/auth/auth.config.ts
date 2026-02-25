/**
 * [PROVIDES]: Auth 运行时配置（baseURL、trustedOrigins、JWT 配置）
 * [DEPENDS]: process.env（BETTER_AUTH_URL/TRUSTED_ORIGINS/ALLOWED_ORIGINS）
 * [POS]: Better Auth 初始化与 Token 服务的共同配置入口
 */

import {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_KEY_ALGORITHM,
  JWT_KEY_CURVE,
  isProduction,
} from './auth.constants';
import type { BetterAuthRateLimitOptions } from 'better-auth';
import type { JwtOptions } from 'better-auth/plugins/jwt';

const DEFAULT_BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS = 60;
const DEFAULT_BETTER_AUTH_RATE_LIMIT_MAX = 20;
const MIN_BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS = 1;
const MIN_BETTER_AUTH_RATE_LIMIT_MAX = 1;

const AUTH_RATE_LIMIT_CUSTOM_RULE_PATHS = [
  '/sign-in/**',
  '/sign-up/**',
  '/change-password/**',
  '/change-email/**',
  '/email-otp/**',
  '/forget-password/**',
] as const;

const readPositiveIntEnv = (
  envKey: string,
  defaultValue: number,
  minValue = 1,
): number => {
  const rawValue = process.env[envKey];
  if (!rawValue) {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < minValue) {
    return defaultValue;
  }

  return parsed;
};

export const getAuthBaseUrl = (): string => {
  const baseUrl = process.env.BETTER_AUTH_URL?.trim();
  if (baseUrl) {
    return baseUrl;
  }

  if (isProduction) {
    throw new Error('BETTER_AUTH_URL must be set in production');
  }

  return 'http://localhost:3000';
};

export const getTrustedOrigins = (): string[] => {
  const raw =
    process.env.TRUSTED_ORIGINS?.trim() || process.env.ALLOWED_ORIGINS?.trim();
  const origins = raw
    ? raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

  if (isProduction && origins.length === 0) {
    throw new Error('TRUSTED_ORIGINS must be set in production');
  }

  return origins;
};

export const getJwtPluginOptions = (baseUrl: string): JwtOptions => ({
  jwt: {
    expirationTime: `${ACCESS_TOKEN_TTL_SECONDS}s`,
    issuer: baseUrl,
    audience: baseUrl,
  },
  jwks: {
    jwksPath: '/jwks',
    keyPairConfig: {
      alg: JWT_KEY_ALGORITHM,
      crv: JWT_KEY_CURVE,
    },
  },
  schema: {
    jwks: {
      modelName: 'Jwks',
    },
  },
});

export const getBetterAuthRateLimitOptions = (): BetterAuthRateLimitOptions => {
  const window = readPositiveIntEnv(
    'BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS',
    DEFAULT_BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS,
    MIN_BETTER_AUTH_RATE_LIMIT_WINDOW_SECONDS,
  );
  const max = readPositiveIntEnv(
    'BETTER_AUTH_RATE_LIMIT_MAX',
    DEFAULT_BETTER_AUTH_RATE_LIMIT_MAX,
    MIN_BETTER_AUTH_RATE_LIMIT_MAX,
  );

  const customRules: NonNullable<BetterAuthRateLimitOptions['customRules']> =
    AUTH_RATE_LIMIT_CUSTOM_RULE_PATHS.reduce<
      NonNullable<BetterAuthRateLimitOptions['customRules']>
    >((acc, path) => {
      acc[path] = { window, max };
      return acc;
    }, {});

  return {
    enabled: true,
    window,
    max,
    customRules,
  };
};
