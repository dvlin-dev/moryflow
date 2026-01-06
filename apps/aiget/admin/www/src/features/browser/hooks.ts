/**
 * Browser React Query hooks
 */
import { useQuery } from '@tanstack/react-query';
import { getBrowserStatus } from './api';

/** Query Key 工厂 */
export const browserKeys = {
  all: ['admin', 'browser'] as const,
  status: () => [...browserKeys.all, 'status'] as const,
};

/**
 * 获取浏览器池状态
 */
export function useBrowserStatus() {
  return useQuery({
    queryKey: browserKeys.status(),
    queryFn: getBrowserStatus,
    refetchInterval: 5000, // 每 5 秒刷新
  });
}
