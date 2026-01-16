/**
 * Jobs Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getJobs,
  getJob,
  getJobStats,
  getErrorStats,
  cleanupStaleJobs,
  type CleanupStaleJobsQuery,
} from './api';
import type { JobsQuery, ErrorStatsQuery } from './types';

/** Query Key 工厂 */
export const jobKeys = {
  all: ['admin', 'jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (query?: JobsQuery) => [...jobKeys.lists(), query] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
  stats: () => [...jobKeys.all, 'stats'] as const,
  errors: (query?: ErrorStatsQuery) => [...jobKeys.all, 'errors', query] as const,
};

/** 任务列表 */
export function useJobs(query: JobsQuery = {}) {
  return useQuery({
    queryKey: jobKeys.list(query),
    queryFn: () => getJobs(query),
  });
}

/** 任务详情 */
export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => getJob(id),
    enabled: !!id,
  });
}

/** 任务统计 */
export function useJobStats() {
  return useQuery({
    queryKey: jobKeys.stats(),
    queryFn: getJobStats,
    refetchInterval: 10000, // 10 秒自动刷新
  });
}

/** 错误统计 */
export function useErrorStats(query: ErrorStatsQuery = {}) {
  return useQuery({
    queryKey: jobKeys.errors(query),
    queryFn: () => getErrorStats(query),
    refetchInterval: 30000, // 30 秒自动刷新
  });
}

/** 清理卡住的任务 */
export function useCleanupStaleJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (query: CleanupStaleJobsQuery = {}) => cleanupStaleJobs(query),
    onSuccess: (data) => {
      if (data.dryRun) {
        toast.info(`发现 ${data.staleJobsCount ?? 0} 个卡住的任务`);
      } else {
        queryClient.invalidateQueries({ queryKey: jobKeys.all });
        toast.success(`已清理 ${data.cleanedCount ?? 0} 个卡住的任务`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || '清理失败');
    },
  });
}
