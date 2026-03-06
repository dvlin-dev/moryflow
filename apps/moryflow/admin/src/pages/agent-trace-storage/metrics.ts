import { formatDateTime } from '@/lib/format';
import type { StorageStatsResponse } from '@/features/agent-traces';

export type StorageStatsViewState = 'loading' | 'error' | 'ready';

interface ResolveStorageStatsViewStateParams {
  isLoading: boolean;
  error: unknown;
  hasStats: boolean;
}

export function resolveStorageStatsViewState({
  isLoading,
  error,
  hasStats,
}: ResolveStorageStatsViewStateParams): StorageStatsViewState {
  if (error && !hasStats) {
    return 'error';
  }
  if (isLoading && !hasStats) {
    return 'loading';
  }
  return 'ready';
}

export function calculatePendingCleanupTotal(stats?: StorageStatsResponse | null): number {
  if (!stats) {
    return 0;
  }
  return stats.pendingCleanup.success + stats.pendingCleanup.failed + stats.pendingCleanup.pending;
}

export function getStorageDateRangeLabel(stats?: StorageStatsResponse | null): string {
  if (!stats?.oldestDate || !stats.newestDate) {
    return '暂无数据';
  }
  return `${formatDateTime(stats.oldestDate)} - ${formatDateTime(stats.newestDate)}`;
}
