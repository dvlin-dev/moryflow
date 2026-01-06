/**
 * Dashboard Hooks
 */
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './api'

/** 获取系统统计 */
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: dashboardApi.getStats,
  })
}

/** 获取健康状态 */
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: dashboardApi.getHealth,
    refetchInterval: 30000, // 30 秒刷新一次
  })
}
