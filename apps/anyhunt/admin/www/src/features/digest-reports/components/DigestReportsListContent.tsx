/**
 * [PROPS]: list state + data + callbacks
 * [EMITS]: table actions
 * [POS]: Digest reports state dispatcher
 */

import { ListEmptyState, ListErrorState, ListLoadingRows } from '@/components/list-state';
import type { Report, ReportListResponse } from '../types';
import type { DigestReportsListState } from '../list-states';
import { DigestReportsTable } from './DigestReportsTable';

export interface DigestReportsListContentProps {
  state: DigestReportsListState;
  data: ReportListResponse | undefined;
  error: unknown;
  onResolve: (report: Report) => void;
  onPageChange: (page: number) => void;
  onViewTopic: (slug: string) => void;
}

export function DigestReportsListContent({
  state,
  data,
  error,
  onResolve,
  onPageChange,
  onViewTopic,
}: DigestReportsListContentProps) {
  switch (state) {
    case 'loading':
      return <ListLoadingRows rows={5} />;
    case 'error':
      return (
        <ListErrorState
          message={error instanceof Error ? error.message : 'Failed to load digest reports'}
        />
      );
    case 'empty':
      return <ListEmptyState message="No reports found" />;
    case 'ready':
      if (!data) {
        return null;
      }

      return (
        <DigestReportsTable
          data={data}
          onResolve={onResolve}
          onPageChange={onPageChange}
          onViewTopic={onViewTopic}
        />
      );
    default:
      return null;
  }
}
