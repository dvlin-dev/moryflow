/**
 * [PROPS]: 列表状态、分页数据与回调
 * [EMITS]: onRowClick/onViewDetail/onPageChange
 * [POS]: Jobs 列表状态分发组件
 */

import { ListEmptyState, ListErrorState, ListLoadingRows } from '@/components/list-state';
import type { JobListItem, PaginatedResponse } from '../types';
import { JobsTable } from './JobsTable';

export type JobsContentState = 'loading' | 'error' | 'empty' | 'ready';

export interface JobsListContentProps {
  state: JobsContentState;
  data: PaginatedResponse<JobListItem> | undefined;
  errorMessage?: string;
  onRowClick: (job: JobListItem) => void;
  onViewDetail: (job: JobListItem) => void;
  onPageChange: (page: number) => void;
}

export function JobsListContent({
  state,
  data,
  errorMessage,
  onRowClick,
  onViewDetail,
  onPageChange,
}: JobsListContentProps) {
  switch (state) {
    case 'loading':
      return <ListLoadingRows />;
    case 'error':
      return <ListErrorState message={errorMessage ?? '加载任务列表失败'} />;
    case 'empty':
      return <ListEmptyState message="没有找到任务" />;
    case 'ready':
      if (!data) {
        return null;
      }

      return (
        <JobsTable
          items={data.items}
          pagination={data.pagination}
          onRowClick={onRowClick}
          onViewDetail={onViewDetail}
          onPageChange={onPageChange}
        />
      );
    default:
      return null;
  }
}
