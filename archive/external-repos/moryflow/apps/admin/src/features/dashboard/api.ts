/**
 * Dashboard API
 */
import { apiClient } from '../../lib/api-client'
import { ADMIN_API, HEALTH_API } from '../../lib/api-paths'
import type { SystemStats, HealthStatus } from '../../types/api'

export const dashboardApi = {
  /** 获取系统统计 */
  getStats: () => apiClient.get<SystemStats>(ADMIN_API.STATS),

  /** 获取健康状态 */
  getHealth: () => apiClient.get<HealthStatus>(HEALTH_API.BASE),
}

export type { SystemStats, HealthStatus }
