/**
 * Jobs 类型定义
 */
export type { ApiResponse, Pagination, PaginatedResponse } from '@/lib/types';

/** 任务状态 */
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** 错误码 */
export type JobErrorCode =
  | 'PAGE_TIMEOUT'
  | 'URL_NOT_ALLOWED'
  | 'SELECTOR_NOT_FOUND'
  | 'BROWSER_ERROR'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INVALID_URL'
  | 'PAGE_NOT_FOUND'
  | 'ACCESS_DENIED';

/** 任务列表项 */
export interface JobListItem {
  id: string;
  url: string;
  status: JobStatus;
  errorCode: JobErrorCode | null;
  error: string | null;
  totalMs: number | null;
  queueWaitMs: number | null;
  fromCache: boolean;
  userId: string;
  userEmail: string;
  createdAt: string;
  completedAt: string | null;
}

/** 耗时详情 */
export interface JobTiming {
  queueWait: number | null;
  fetch: number | null;
  render: number | null;
  transform: number | null;
  screenshot: number | null;
  imageProcess: number | null;
  upload: number | null;
  total: number | null;
}

/** 截图信息 */
export interface JobScreenshot {
  url: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  format: string | null;
  expiresAt: string | null;
}

/** 任务详情 */
export interface JobDetail {
  id: string;
  url: string;
  requestHash: string;
  status: JobStatus;
  options: Record<string, unknown>;
  result: Record<string, unknown> | null;
  screenshot: JobScreenshot | null;
  error: string | null;
  errorCode: JobErrorCode | null;
  timing: JobTiming;
  fromCache: boolean;
  quotaDeducted: boolean;
  quotaSource: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  apiKey: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

/** 任务统计 */
export interface JobStats {
  total: number;
  today: number;
  thisHour: number;
  pending: number;
  processing: number;
  failedToday: number;
  avgProcessingMs: number;
  byStatus: Record<string, number>;
}

/** 错误统计 */
export interface ErrorStats {
  byCode: { code: JobErrorCode; count: number }[];
  byDay: { date: string; count: number }[];
  recent: {
    id: string;
    url: string;
    errorCode: JobErrorCode | null;
    error: string | null;
    userId: string;
    userEmail: string;
    createdAt: string;
  }[];
}

/** 任务查询参数 */
export interface JobsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: JobStatus;
  errorCode?: JobErrorCode;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** 错误统计查询参数 */
export interface ErrorStatsQuery {
  days?: number;
}
