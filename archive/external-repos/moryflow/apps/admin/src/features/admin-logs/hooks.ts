/**
 * Activity Logs Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activityLogsApi, type ActivityLogQueryParams } from './api'

export const ACTIVITY_LOGS_QUERY_KEY = ['activity-logs'] as const
export const ACTIVITY_LOGS_STATS_QUERY_KEY = ['activity-logs-stats'] as const

/** 查询活动日志列表 */
export function useActivityLogs(
  params: Omit<ActivityLogQueryParams, 'limit' | 'offset'> & {
    page: number
    pageSize: number
  },
) {
  const { page, pageSize, ...queryParams } = params

  return useQuery({
    queryKey: [...ACTIVITY_LOGS_QUERY_KEY, { ...queryParams, page }],
    queryFn: () =>
      activityLogsApi.query({
        ...queryParams,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
  })
}

/** 获取存储统计 */
export function useActivityLogStorageStats() {
  return useQuery({
    queryKey: ACTIVITY_LOGS_STATS_QUERY_KEY,
    queryFn: () => activityLogsApi.getStorageStats(),
  })
}

/** 清理旧日志 */
export function useCleanupActivityLogs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (days: number) => activityLogsApi.cleanup(days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVITY_LOGS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACTIVITY_LOGS_STATS_QUERY_KEY })
    },
  })
}

/** 导出日志 */
export function useExportActivityLogs() {
  return useMutation({
    mutationFn: activityLogsApi.exportLogs,
  })
}
