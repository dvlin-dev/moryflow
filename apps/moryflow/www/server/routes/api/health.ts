/**
 * [PROVIDES]: 健康检查接口
 * [DEPENDS]: 无
 * [POS]: 负载均衡健康探测
 */

import { defineEventHandler } from 'h3';

export default defineEventHandler(() => {
  const body = JSON.stringify({ ok: true, status: 'ok' });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
});
