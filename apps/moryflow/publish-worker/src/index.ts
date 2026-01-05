/**
 * [INPUT]: Cloudflare Worker FetchEvent（moryflow.app / *.moryflow.app）
 * [OUTPUT]: 站点静态内容响应（含 404/下线/过期页面）
 * [POS]: Publish Worker 入口，委托给 handler.ts
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 apps/moryflow/publish-worker/CLAUDE.md。
 */

import { handleRequest } from './handler';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};

