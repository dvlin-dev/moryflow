/**
 * Dashboard 类型定义
 */

/** 仪表盘统计数据 */
export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  /** 今日 Memory 数量 */
  memoriesToday: number;
  /** 本月收入（单位：分） */
  revenueMTD: number;
}

/** 图表数据点 */
export interface ChartDataPoint {
  date: string;
  value: number;
}

/** 图表数据 */
export interface ChartData {
  /** Memory 趋势 */
  memories: ChartDataPoint[];
  /** 收入趋势 */
  revenue: ChartDataPoint[];
}
