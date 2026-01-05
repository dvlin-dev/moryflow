/**
 * Dashboard React Query hooks
 */
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getChartData } from './api';

const STATS_KEY = ['dashboard', 'stats'] as const;
const CHARTS_KEY = ['dashboard', 'charts'] as const;

/**
 * 获取仪表盘统计数据
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: getDashboardStats,
  });
}

/**
 * 获取图表数据（近 7 天）
 */
export function useChartData() {
  return useQuery({
    queryKey: CHARTS_KEY,
    queryFn: getChartData,
  });
}
