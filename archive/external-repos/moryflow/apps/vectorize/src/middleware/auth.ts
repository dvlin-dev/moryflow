import type { MiddlewareHandler } from 'hono'
import type { Env } from '../types'

/**
 * Bearer Token 认证中间件
 * 验证请求头中的 Authorization: Bearer <token>
 */
export const bearerAuthMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    return c.json({ error: 'Missing authentication header' }, 401)
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return c.json({ error: 'Authentication format error' }, 401)
  }

  if (token !== c.env.API_SECRET) {
    return c.json({ error: 'Authentication failed' }, 401)
  }

  await next()
}
