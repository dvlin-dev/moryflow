/**
 * [PROPS]: list 状态与数据
 * [EMITS]: onPageChange
 * [POS]: Request Logs 列表状态分发
 */

import { ListEmptyState, ListErrorState, ListLoadingRows } from '@/components/list-state';
import type { RequestLogListResponse } from '../types';
import { getQueryErrorMessage } from '../utils';
import { RequestLogsTable } from './RequestLogsTable';

export type RequestLogsListState = 'loading' | 'error' | 'empty' | 'ready';

export function resolveRequestLogsListState(params: {
  isLoading: boolean;
  hasError: boolean;
  itemCount: number;
}): RequestLogsListState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.hasError) {
    return 'error';
  }

  if (params.itemCount === 0) {
    return 'empty';
  }

  return 'ready';
}

export interface RequestLogsListContentProps {
  state: RequestLogsListState;
  data: RequestLogListResponse | undefined;
  error: unknown;
  onPageChange: (page: number) => void;
}

export function RequestLogsListContent({
  state,
  data,
  error,
  onPageChange,
}: RequestLogsListContentProps) {
  switch (state) {
    case 'loading':
      return <ListLoadingRows rows={5} />;
    case 'error':
      return (
        <ListErrorState message={getQueryErrorMessage(error, 'Failed to load request logs')} />
      );
    case 'empty':
      return <ListEmptyState message="No request logs found" />;
    case 'ready':
      if (!data) {
        return null;
      }

      return <RequestLogsTable data={data} onPageChange={onPageChange} />;
    default:
      return null;
  }
}
