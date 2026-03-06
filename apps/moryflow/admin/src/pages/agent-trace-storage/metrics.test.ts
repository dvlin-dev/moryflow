import { describe, expect, it } from 'vitest';
import {
  calculatePendingCleanupTotal,
  getStorageDateRangeLabel,
  resolveStorageStatsViewState,
} from './metrics';
import type { StorageStatsResponse } from '@/features/agent-traces';

function buildStats(): StorageStatsResponse {
  return {
    retentionSuccess: 30,
    retentionFailed: 90,
    pendingCleanup: {
      success: 3,
      failed: 2,
      pending: 1,
    },
    traceCount: 100,
    spanCount: 200,
    oldestDate: '2026-01-01T00:00:00.000Z',
    newestDate: '2026-02-01T00:00:00.000Z',
    countByStatus: {
      completed: 50,
      failed: 20,
      interrupted: 10,
      pending: 20,
    },
    estimatedSizeMB: 128,
  };
}

describe('resolveStorageStatsViewState', () => {
  it('仅在无缓存数据时才进入 loading', () => {
    expect(
      resolveStorageStatsViewState({
        isLoading: true,
        error: null,
        hasStats: false,
      })
    ).toBe('loading');
  });

  it('请求报错且无数据时返回 error', () => {
    expect(
      resolveStorageStatsViewState({
        isLoading: false,
        error: new Error('boom'),
        hasStats: false,
      })
    ).toBe('error');
  });

  it('有缓存数据时优先返回 ready', () => {
    expect(
      resolveStorageStatsViewState({
        isLoading: true,
        error: new Error('boom'),
        hasStats: true,
      })
    ).toBe('ready');
  });
});

describe('calculatePendingCleanupTotal', () => {
  it('无 stats 时返回 0', () => {
    expect(calculatePendingCleanupTotal(null)).toBe(0);
    expect(calculatePendingCleanupTotal(undefined)).toBe(0);
  });

  it('正确汇总待清理数量', () => {
    expect(calculatePendingCleanupTotal(buildStats())).toBe(6);
  });
});

describe('getStorageDateRangeLabel', () => {
  it('无数据时返回暂无数据', () => {
    expect(getStorageDateRangeLabel(null)).toBe('暂无数据');
  });

  it('有数据时返回格式化时间区间', () => {
    const label = getStorageDateRangeLabel(buildStats());
    expect(label).toContain(' - ');
    expect(label).not.toBe('暂无数据');
  });
});
