/**
 * Request Logs API
 */

import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import { buildUrl } from '@/lib/query-utils';
import type {
  RequestLogIpQuery,
  RequestLogIpResponse,
  RequestLogListQuery,
  RequestLogListResponse,
  RequestLogOverview,
  RequestLogUsersQuery,
  RequestLogUsersResponse,
} from './types';

export async function getRequestLogs(
  query: RequestLogListQuery = {}
): Promise<RequestLogListResponse> {
  const url = buildUrl(ADMIN_API.LOGS_REQUESTS, {
    page: query.page,
    limit: query.limit,
    from: query.from,
    to: query.to,
    statusCode: query.statusCode,
    routeGroup: query.routeGroup,
    pathLike: query.pathLike,
    requestId: query.requestId,
    userId: query.userId,
    apiKeyId: query.apiKeyId,
    clientIp: query.clientIp,
    errorOnly: query.errorOnly ? 'true' : undefined,
  });

  return apiClient.get<RequestLogListResponse>(url);
}

export async function getRequestLogsOverview(
  query: {
    from?: string;
    to?: string;
  } = {}
): Promise<RequestLogOverview> {
  const url = buildUrl(ADMIN_API.LOGS_OVERVIEW, {
    from: query.from,
    to: query.to,
  });

  return apiClient.get<RequestLogOverview>(url);
}

export async function getRequestLogsUsers(
  query: RequestLogUsersQuery = {}
): Promise<RequestLogUsersResponse> {
  const url = buildUrl(ADMIN_API.LOGS_USERS, {
    from: query.from,
    to: query.to,
    limit: query.limit,
  });

  return apiClient.get<RequestLogUsersResponse>(url);
}

export async function getRequestLogsIp(
  query: RequestLogIpQuery = {}
): Promise<RequestLogIpResponse> {
  const url = buildUrl(ADMIN_API.LOGS_IP, {
    from: query.from,
    to: query.to,
    limit: query.limit,
    clientIp: query.clientIp,
  });

  return apiClient.get<RequestLogIpResponse>(url);
}
