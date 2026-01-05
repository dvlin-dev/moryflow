import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bearerAuthMiddleware } from './middleware/auth'
import embedRoutes from './routes/embed'
import vectorsRoutes from './routes/vectors'
import type { Env, ErrorResponse } from './types'

const app = new Hono<{ Bindings: Env }>()

// CORS 配置
app.use(
  '/*',
  cors({
    origin: ['https://moryflow.com', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

// API 路由需要认证
app.use('/api/*', bearerAuthMiddleware)

// 健康检查（不需要认证）
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    timestamp: Date.now(),
    model: '@cf/qwen/qwen3-embedding-0.6b',
    dimensions: 1024,
  }),
)

// 挂载路由
app.route('/api/embed', embedRoutes)
app.route('/api/vectors', vectorsRoutes)

// 404 处理
app.notFound((c) => c.json<ErrorResponse>({ error: 'Not Found' }, 404))

// 全局错误处理
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json<ErrorResponse>(
    {
      error: 'Internal Server Error',
      details: err instanceof Error ? err.message : 'Unknown error',
    },
    500,
  )
})

export default app
