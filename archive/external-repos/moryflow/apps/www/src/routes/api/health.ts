/**
 * [PROVIDES]: 健康检查端点
 * [DEPENDS]: 无
 * [POS]: 部署健康检查，供负载均衡器使用
 */

import { createServerFileRoute } from '@tanstack/react-start/server'

export const ServerRoute = createServerFileRoute('/api/health')({
  methods: ['GET'],
  handler: async () => {
    return Response.json({ status: 'ok', timestamp: Date.now() })
  },
})
