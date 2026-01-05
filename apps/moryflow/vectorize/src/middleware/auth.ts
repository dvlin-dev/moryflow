/**
 * [PROVIDES]: bearerAuthMiddleware
 * [DEPENDS]: src/types.ts
 * [POS]: 最小 Bearer Token 鉴权（服务级 API_SECRET）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新部署侧 secret 配置与调用方实现。
 */

import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types';

export const bearerAuthMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Missing authentication header' }, 401);

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return c.json({ error: 'Authentication format error' }, 401);

  if (token !== c.env.API_SECRET) return c.json({ error: 'Authentication failed' }, 401);
  await next();
};

