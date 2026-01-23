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
import type { JwtOptions } from 'better-auth/plugins/jwt';

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
