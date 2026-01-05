/**
 * Moryflow Publish Worker
 * 处理 *.moryflow.app 的站点访问请求
 *
 * 功能：
 * 1. 解析 subdomain
 * 2. 从 R2 读取 _meta.json 获取站点配置
 * 3. 检查站点过期状态
 * 4. 从 R2 读取文件返回
 * 5. 注入水印（免费用户）
 */

import { handleRequest } from './handler';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
