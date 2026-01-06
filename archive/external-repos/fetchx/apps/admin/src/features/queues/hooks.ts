/**
 * Queues Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAllQueueStats,
  getQueueStats,
  getQueueJobs,
  retryJob,
  retryAllFailed,
  cleanQueue,
  pauseQueue,
  resumeQueue,
} from './api';
import type { QueueJobsQuery } from './types';

/** Query Key 工厂 */
export const queueKeys = {
  all: ['admin', 'queues'] as const,
  list: () => [...queueKeys.all, 'list'] as const,
  details: () => [...queueKeys.all, 'detail'] as const,
  detail: (name: string) => [...queueKeys.details(), name] as const,
  jobs: (name: string, query?: QueueJobsQuery) =>
    [...queueKeys.detail(name), 'jobs', query] as const,
};

/** 所有队列状态 */
export function useAllQueueStats() {
  return useQuery({
    queryKey: queueKeys.list(),
    queryFn: getAllQueueStats,
    refetchInterval: 5000, // 5 秒自动刷新
  });
}

/** 单个队列状态 */
export function useQueueStats(name: string) {
  return useQuery({
    queryKey: queueKeys.detail(name),
    queryFn: () => getQueueStats(name),
    enabled: !!name,
    refetchInterval: 5000,
  });
}

/** 队列任务列表 */
export function useQueueJobs(name: string, query: QueueJobsQuery = {}) {
  return useQuery({
    queryKey: queueKeys.jobs(name, query),
    queryFn: () => getQueueJobs(name, query),
    enabled: !!name,
    refetchInterval: 5000,
  });
}

/** 重试单个任务 */
export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, jobId }: { name: string; jobId: string }) =>
      retryJob(name, jobId),
    onSuccess: () => {
      toast.success('任务已重新加入队列');
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
    onError: () => {
      toast.error('重试失败');
    },
  });
}

/** 重试所有失败任务 */
export function useRetryAllFailed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => retryAllFailed(name),
    onSuccess: (data) => {
      toast.success(`已重试 ${data.retried} 个任务`);
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
    onError: () => {
      toast.error('重试失败');
    },
  });
}

/** 清空队列 */
export function useCleanQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, status }: { name: string; status: 'completed' | 'failed' }) =>
      cleanQueue(name, status),
    onSuccess: (data) => {
      toast.success(`已清理 ${data.removed} 个任务`);
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
    onError: () => {
      toast.error('清理失败');
    },
  });
}

/** 暂停/恢复队列 */
export function usePauseQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, pause }: { name: string; pause: boolean }) =>
      pause ? pauseQueue(name) : resumeQueue(name),
    onSuccess: (data) => {
      toast.success(data.paused ? '队列已暂停' : '队列已恢复');
      queryClient.invalidateQueries({ queryKey: queueKeys.all });
    },
    onError: () => {
      toast.error('操作失败');
    },
  });
}
