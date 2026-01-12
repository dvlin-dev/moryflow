/**
 * [PROVIDES]: 健康检查端点
 * [DEPENDS]: 无
 * [POS]: 部署健康检查，供负载均衡器使用
 */

import { createFileRoute } from '@tanstack/react-router';

// This is a placeholder route - actual health check is handled by Nitro
export const Route = createFileRoute('/api/health')({
  component: () => null,
});
