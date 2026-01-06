/**
 * Jobs API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import { buildUrl } from '@/lib/query-utils';
import type {
  PaginatedResponse,
  JobListItem,
  JobDetail,
  JobStats,
  ErrorStats,
  JobsQuery,
  ErrorStatsQuery,
} from './types';

/** 获取任务列表 */
export async function getJobs(
  query: JobsQuery = {},
): Promise<PaginatedResponse<JobListItem>> {
  const url = buildUrl(ADMIN_API.JOBS, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    status: query.status,
    errorCode: query.errorCode,
    userId: query.userId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
  });
  return apiClient.get<PaginatedResponse<JobListItem>>(url);
}

/** 获取单个任务 */
export async function getJob(id: string): Promise<JobDetail> {
  return apiClient.get<JobDetail>(`${ADMIN_API.JOBS}/${id}`);
}

/** 获取任务统计 */
export async function getJobStats(): Promise<JobStats> {
  return apiClient.get<JobStats>(`${ADMIN_API.JOBS}/stats`);
}

/** 获取错误统计 */
export async function getErrorStats(query: ErrorStatsQuery = {}): Promise<ErrorStats> {
  const params = new URLSearchParams();
  if (query.days) params.set('days', String(query.days));
  const qs = params.toString();
  const url = qs ? `${ADMIN_API.JOBS}/errors?${qs}` : `${ADMIN_API.JOBS}/errors`;
  return apiClient.get<ErrorStats>(url);
}

/** 清理卡住任务的查询参数 */
export interface CleanupStaleJobsQuery {
  maxAgeMinutes?: number;
  dryRun?: boolean;
}

/** 清理卡住任务的响应 */
export interface CleanupStaleJobsResult {
  dryRun: boolean;
  cleanedCount?: number;
  staleJobsCount?: number;
  cleanedJobs?: Array<{
    id: string;
    url: string;
    userId: string;
    userEmail: string;
    createdAt: string;
  }>;
  staleJobs?: Array<{
    id: string;
    url: string;
    userId: string;
    userEmail: string;
    createdAt: string;
    staleMinutes: number;
  }>;
}

/** 清理卡住的任务 */
export async function cleanupStaleJobs(
  query: CleanupStaleJobsQuery = {},
): Promise<CleanupStaleJobsResult> {
  const params = new URLSearchParams();
  if (query.maxAgeMinutes) params.set('maxAgeMinutes', String(query.maxAgeMinutes));
  if (query.dryRun !== undefined) params.set('dryRun', String(query.dryRun));
  const qs = params.toString();
  const url = qs
    ? `${ADMIN_API.JOBS}/cleanup-stale?${qs}`
    : `${ADMIN_API.JOBS}/cleanup-stale`;
  return apiClient.post<CleanupStaleJobsResult>(url);
}
