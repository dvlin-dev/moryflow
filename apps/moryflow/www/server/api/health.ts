/**
 * [PROVIDES]: 健康检查端点
 * [DEPENDS]: 无
 * [POS]: 部署健康检查，供负载均衡器使用
 */

export default defineEventHandler(() => {
  return { status: 'ok', timestamp: Date.now() };
});
