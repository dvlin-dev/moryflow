/**
 * [PROVIDES]: useRequestLogsFilters
 * [DEPENDS]: logs utils/types
 * [POS]: LogsRequests 筛选与 query 编排
 */

import { useState } from 'react';
import type { RequestLogListQuery } from './types';
import { REQUEST_LOG_DEFAULT_PAGE_LIMIT } from './constants';
import { toIsoDateTimeOrUndefined, toStatusCodeOrUndefined } from './utils';

export interface RequestLogsFiltersState {
  from: string;
  to: string;
  routeGroup: string;
  statusCode: string;
  pathLike: string;
  userId: string;
  clientIp: string;
  errorOnly: 'all' | 'errors';
}

export const initialRequestLogsFilters: RequestLogsFiltersState = {
  from: '',
  to: '',
  routeGroup: '',
  statusCode: '',
  pathLike: '',
  userId: '',
  clientIp: '',
  errorOnly: 'all',
};

interface UseRequestLogsFiltersOptions {
  initialLimit?: number;
}

export function useRequestLogsFilters(options: UseRequestLogsFiltersOptions = {}) {
  const limit = options.initialLimit ?? REQUEST_LOG_DEFAULT_PAGE_LIMIT;

  const [query, setQuery] = useState<RequestLogListQuery>({
    page: 1,
    limit,
  });
  const [filters, setFilters] = useState<RequestLogsFiltersState>(initialRequestLogsFilters);

  const applyFilters = () => {
    setQuery({
      page: 1,
      limit: query.limit ?? limit,
      from: toIsoDateTimeOrUndefined(filters.from),
      to: toIsoDateTimeOrUndefined(filters.to),
      routeGroup: filters.routeGroup || undefined,
      statusCode: toStatusCodeOrUndefined(filters.statusCode),
      pathLike: filters.pathLike || undefined,
      userId: filters.userId || undefined,
      clientIp: filters.clientIp || undefined,
      errorOnly: filters.errorOnly === 'errors' ? true : undefined,
    });
  };

  const resetFilters = () => {
    setFilters(initialRequestLogsFilters);
    setQuery({
      page: 1,
      limit: query.limit ?? limit,
    });
  };

  const setPage = (page: number) => {
    setQuery((prev) => ({
      ...prev,
      page,
    }));
  };

  return {
    query,
    filters,
    setFilters,
    applyFilters,
    resetFilters,
    setPage,
  };
}
