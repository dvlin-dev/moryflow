/**
 * Dashboard React Query hooks
 */
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getChartData } from './api';

/** Query Key 工厂 */
export const dashboardKeys = {
  all: ['admin', 'dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  charts: () => [...dashboardKeys.all, 'charts'] as const,
};

/**
 * 获取仪表盘统计数据
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
  });
}

/**
 * 获取图表数据（近 7 天）
 */
export function useChartData() {
  return useQuery({
    queryKey: dashboardKeys.charts(),
    queryFn: getChartData,
  });
}
