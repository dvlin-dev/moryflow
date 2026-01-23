/**
 * [PROVIDES]: bearerAuthMiddleware
 * [DEPENDS]: src/types.ts, jose
 * [POS]: Vectorize Worker 鉴权（JWT + JWKS）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新部署侧 secret 配置与调用方实现。
 */

import type { MiddlewareHandler } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from '../types';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

const getAuthBaseUrl = (env: Env): string => {
  const baseUrl = env.AUTH_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error('AUTH_BASE_URL is required');
  }
  return baseUrl;
};

const getJwks = (baseUrl: string) => {
  const cached = jwksCache.get(baseUrl);
  if (cached) {
    return cached;
  }

  const jwks = createRemoteJWKSet(new URL('/api/auth/jwks', baseUrl));
  jwksCache.set(baseUrl, jwks);
  return jwks;
};

const verifyAccessToken = async (token: string, env: Env) => {
  const baseUrl = getAuthBaseUrl(env);
  const jwks = getJwks(baseUrl);
  const { payload } = await jwtVerify(token, jwks, {
    issuer: baseUrl,
    audience: baseUrl,
  });

  if (!payload?.sub || payload.tokenType !== 'access') {
    return null;
  }

  return payload;
};

export const bearerAuthMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Missing authentication header' }, 401);

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return c.json({ error: 'Authentication format error' }, 401);

  try {
    const payload = await verifyAccessToken(token, c.env);
    if (!payload) {
      return c.json({ error: 'Authentication failed' }, 401);
    }
    await next();
  } catch (error) {
    console.error('Failed to verify access token', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
};
