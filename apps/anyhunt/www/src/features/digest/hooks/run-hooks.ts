/**
 * [PROVIDES]: run history query hooks
 * [POS]: digest runs domain hooks
 */

import { useQuery } from '@tanstack/react-query';
import * as api from '../api';
import type { RunQueryParams } from '../types';
import { digestKeys } from './query-keys';

export function useRuns(subscriptionId: string, params?: RunQueryParams) {
  return useQuery({
    queryKey: [...digestKeys.runs(subscriptionId), params],
    queryFn: () => api.fetchRuns(subscriptionId, params),
    enabled: Boolean(subscriptionId),
  });
}
