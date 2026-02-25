/**
 * Request Logs Hooks
 */

import { useQuery } from '@tanstack/react-query';
import {
  getRequestLogs,
  getRequestLogsIp,
  getRequestLogsOverview,
  getRequestLogsUsers,
} from './api';
import type { RequestLogIpQuery, RequestLogListQuery, RequestLogUsersQuery } from './types';

export const requestLogKeys = {
  all: ['admin', 'logs'] as const,
  requests: (query?: RequestLogListQuery) => [...requestLogKeys.all, 'requests', query] as const,
  overview: (query?: { from?: string; to?: string }) =>
    [...requestLogKeys.all, 'overview', query] as const,
  users: (query?: RequestLogUsersQuery) => [...requestLogKeys.all, 'users', query] as const,
  ip: (query?: RequestLogIpQuery) => [...requestLogKeys.all, 'ip', query] as const,
};

export function useRequestLogs(query: RequestLogListQuery = {}) {
  return useQuery({
    queryKey: requestLogKeys.requests(query),
    queryFn: () => getRequestLogs(query),
  });
}

export function useRequestLogsOverview(query: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: requestLogKeys.overview(query),
    queryFn: () => getRequestLogsOverview(query),
    refetchInterval: 30000,
  });
}

export function useRequestLogsUsers(query: RequestLogUsersQuery = {}) {
  return useQuery({
    queryKey: requestLogKeys.users(query),
    queryFn: () => getRequestLogsUsers(query),
    refetchInterval: 30000,
  });
}

export function useRequestLogsIp(query: RequestLogIpQuery = {}) {
  return useQuery({
    queryKey: requestLogKeys.ip(query),
    queryFn: () => getRequestLogsIp(query),
    refetchInterval: 30000,
  });
}
