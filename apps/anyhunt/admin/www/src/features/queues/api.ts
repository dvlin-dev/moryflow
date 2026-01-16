/**
 * Queues API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  AllQueueStats,
  QueueStats,
  QueueJobsResponse,
  QueueJobsQuery,
  QueueOperationResult,
} from './types';

/** 获取所有队列状态 */
export async function getAllQueueStats(): Promise<AllQueueStats> {
  return apiClient.get<AllQueueStats>(ADMIN_API.QUEUES);
}

/** 获取单个队列状态 */
export async function getQueueStats(name: string): Promise<QueueStats> {
  return apiClient.get<QueueStats>(`${ADMIN_API.QUEUES}/${name}`);
}

/** 获取队列任务列表 */
export async function getQueueJobs(
  name: string,
  query: QueueJobsQuery = {}
): Promise<QueueJobsResponse> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const url = qs ? `${ADMIN_API.QUEUES}/${name}/jobs?${qs}` : `${ADMIN_API.QUEUES}/${name}/jobs`;
  return apiClient.get<QueueJobsResponse>(url);
}

/** 重试单个任务 */
export async function retryJob(name: string, jobId: string): Promise<QueueOperationResult> {
  return apiClient.post<QueueOperationResult>(`${ADMIN_API.QUEUES}/${name}/jobs/${jobId}/retry`);
}

/** 重试所有失败任务 */
export async function retryAllFailed(name: string): Promise<QueueOperationResult> {
  return apiClient.post<QueueOperationResult>(`${ADMIN_API.QUEUES}/${name}/retry-all`);
}

/** 清空队列 */
export async function cleanQueue(
  name: string,
  status: 'completed' | 'failed' = 'completed'
): Promise<QueueOperationResult> {
  return apiClient.post<QueueOperationResult>(`${ADMIN_API.QUEUES}/${name}/clean?status=${status}`);
}

/** 暂停队列 */
export async function pauseQueue(name: string): Promise<QueueOperationResult> {
  return apiClient.post<QueueOperationResult>(`${ADMIN_API.QUEUES}/${name}/pause`);
}

/** 恢复队列 */
export async function resumeQueue(name: string): Promise<QueueOperationResult> {
  return apiClient.post<QueueOperationResult>(`${ADMIN_API.QUEUES}/${name}/resume`);
}
