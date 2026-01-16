/**
 * Dashboard 类型定义
 */
export type { ApiResponse } from '@/lib/types';

/** 仪表盘统计数据 */
export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  screenshotsToday: number;
  revenueMTD: number; // Amount in cents
}

/** 图表数据点 */
export interface ChartDataPoint {
  date: string;
  value: number;
}

/** 图表数据 */
export interface ChartData {
  screenshots: ChartDataPoint[];
  revenue: ChartDataPoint[];
}
