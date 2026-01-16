/**
 * Digest Reports Hooks
 *
 * [PROVIDES]: React Query hooks for report operations
 * [POS]: Data fetching and mutation hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from './api';
import type { ReportQuery, ResolveReportInput } from './types';

export const reportKeys = {
  all: ['admin', 'digest-reports'] as const,
  list: (params?: ReportQuery) => [...reportKeys.all, 'list', params] as const,
};

export function useReports(params?: ReportQuery) {
  return useQuery({
    queryKey: reportKeys.list(params),
    queryFn: () => api.fetchReports(params),
    refetchInterval: 30000, // 30 秒刷新
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveReportInput }) =>
      api.resolveReport(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
      toast.success('Report resolved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resolve report');
    },
  });
}
