/**
 * Request Logs 类型定义
 */

export type { Pagination, PaginatedResponse } from '@/lib/types';

export interface RequestLogListItem {
  id: string;
  createdAt: string;
  requestId: string | null;
  method: string;
  path: string;
  routeGroup: string | null;
  statusCode: number;
  durationMs: number;
  authType: string | null;
  userId: string | null;
  apiKeyId: string | null;
  clientIp: string;
  forwardedFor: string | null;
  origin: string | null;
  referer: string | null;
  userAgent: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryAfter: string | null;
  rateLimitLimit: string | null;
  rateLimitRemaining: string | null;
  rateLimitReset: string | null;
  requestBytes: number | null;
  responseBytes: number | null;
}

export interface RequestLogListQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  statusCode?: number;
  routeGroup?: string;
  pathLike?: string;
  requestId?: string;
  userId?: string;
  apiKeyId?: string;
  clientIp?: string;
  errorOnly?: boolean;
}

export interface RequestLogListResponse {
  items: RequestLogListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  window: {
    from: string;
    to: string;
  };
}

export interface RequestLogOverview {
  window: {
    from: string;
    to: string;
  };
  totalRequests: number;
  errorRequests: number;
  errorRate: number;
  p95DurationMs: number;
  topRoutes: Array<{
    routeGroup: string;
    requestCount: number;
    errorCount: number;
    errorRate: number;
    avgDurationMs: number;
  }>;
  topErrorCodes: Array<{
    errorCode: string;
    count: number;
  }>;
}

export interface RequestLogUsersQuery {
  from?: string;
  to?: string;
  limit?: number;
}

export interface RequestLogUsersResponse {
  window: {
    from: string;
    to: string;
  };
  topUsers: Array<{
    userId: string;
    requestCount: number;
    errorCount: number;
    errorRate: number;
    avgDurationMs: number;
  }>;
  activeUsersDaily: Array<{
    date: string;
    activeUsers: number;
  }>;
}

export interface RequestLogIpQuery {
  from?: string;
  to?: string;
  limit?: number;
  clientIp?: string;
}

export interface RequestLogIpResponse {
  window: {
    from: string;
    to: string;
  };
  topIpByRequests: Array<{
    clientIp: string;
    requestCount: number;
    errorCount: number;
    errorRate: number;
  }>;
  topIpByErrorRate: Array<{
    clientIp: string;
    requestCount: number;
    errorCount: number;
    errorRate: number;
  }>;
  ipTrend: Array<{
    date: string;
    requestCount: number;
    errorCount: number;
  }>;
}
