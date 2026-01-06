/**
 * Dashboard API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type { DashboardStats, ChartData } from './types';

/**
 * 获取仪表盘统计数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient.get<DashboardStats>(ADMIN_API.DASHBOARD);
}

/**
 * 获取图表数据（近 7 天）
 */
export async function getChartData(): Promise<ChartData> {
  return apiClient.get<ChartData>(`${ADMIN_API.DASHBOARD}/charts`);
}
