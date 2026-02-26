/**
 * [PROVIDES]: queryClient
 * [DEPENDS]: @tanstack/react-query
 * [POS]: Admin 应用级 QueryClient 单例
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});
