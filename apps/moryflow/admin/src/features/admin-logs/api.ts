/**
 * Activity Logs API
 */
import { adminApi } from '../../lib/api';
import { apiClient } from '../../lib/api-client';
import type {
  ActivityLog,
  ActivityLogListResponse,
  ActivityLogStorageStats,
} from '../../types/api';

/** 查询参数 */
export interface ActivityLogQueryParams {
  userId?: string;
  email?: string;
  category?: string;
  action?: string;
  level?: 'info' | 'warn' | 'error';
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
}

export const activityLogsApi = {
  /** 查询活动日志列表 */
  query: (params: ActivityLogQueryParams) => {
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.set('userId', params.userId);
    if (params.email) searchParams.set('email', params.email);
    if (params.category) searchParams.set('category', params.category);
    if (params.action) searchParams.set('action', params.action);
    if (params.level) searchParams.set('level', params.level);
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    searchParams.set('limit', String(params.limit));
    searchParams.set('offset', String(params.offset));

    return adminApi.get<ActivityLogListResponse>(`/activity-logs?${searchParams.toString()}`);
  },

  /** 获取存储统计 */
  getStorageStats: () => adminApi.get<ActivityLogStorageStats>('/activity-logs/stats'),

  /** 清理旧日志 */
  cleanup: (days: number) =>
    adminApi.post<{ deletedCount: number }>('/activity-logs/cleanup', {
      days,
    }),

  /** 导出日志 */
  exportLogs: async (
    params: Omit<ActivityLogQueryParams, 'limit' | 'offset'> & {
      format: 'csv' | 'json';
    }
  ) => {
    const blob = await apiClient.postBlob('/api/v1/admin/activity-logs/export', params);

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.${params.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};

export type { ActivityLog };
