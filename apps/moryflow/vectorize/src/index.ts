/**
 * [INPUT]: Cloudflare Worker HTTP 请求
 * [OUTPUT]: Embedding 与 Vectorize API 响应
 * [POS]: Moryflow Vectorize Worker 入口（Hono）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 wrangler 配置与调用方（CORS/路由前缀）。
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bearerAuthMiddleware } from './middleware/auth';
import embedRoutes from './routes/embed';
import vectorsRoutes from './routes/vectors';
import type { Env, ErrorResponse } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use(
  '/*',
  cors({
    origin: ['https://www.moryflow.com', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use('/api/*', bearerAuthMiddleware);

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    timestamp: Date.now(),
    model: '@cf/qwen/qwen3-embedding-0.6b',
    dimensions: 1024,
  }),
);

app.route('/api/embed', embedRoutes);
app.route('/api/vectors', vectorsRoutes);

app.notFound((c) => c.json<ErrorResponse>({ error: 'Not Found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json<ErrorResponse>(
    { error: 'Internal Server Error', details: err instanceof Error ? err.message : 'Unknown error' },
    500,
  );
});

export default app;

