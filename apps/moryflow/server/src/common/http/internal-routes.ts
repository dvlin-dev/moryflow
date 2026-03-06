/**
 * [PROVIDES]: 服务端 internal route 前缀排除常量
 * [DEPENDS]: Nest global prefix exclude 配置
 * [POS]: internal 控制面路由事实源，避免 main、测试和 runbook 漂移
 */

export const INTERNAL_GLOBAL_PREFIX_EXCLUDES = [
  'health',
  'health/(.*)',
  'internal/metrics',
  'internal/metrics/(.*)',
  'internal/sync',
  'internal/sync/(.*)',
] as const;
