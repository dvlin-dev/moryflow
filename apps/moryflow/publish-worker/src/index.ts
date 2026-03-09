/**
 * [INPUT]: Cloudflare Worker FetchEvent（moryflow.app / *.moryflow.app）
 * [OUTPUT]: 站点静态内容响应（含 404/下线/过期页面）
 * [POS]: Publish Worker 入口，委托给 handler.ts
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { handleRequest } from './handler';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
