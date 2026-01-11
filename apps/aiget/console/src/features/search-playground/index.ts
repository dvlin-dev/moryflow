/**
 * Search Playground 模块
 */

import { useMutation } from '@tanstack/react-query';
import { FETCHX_API } from '@/lib/api-paths';
import {
  ApiKeyClient,
  type SearchRequest,
  type SearchResponse,
} from '@/features/playground-shared';

// API
export async function search(apiKey: string, request: SearchRequest): Promise<SearchResponse> {
  const client = new ApiKeyClient({ apiKey, timeout: 60000 });
  return client.post<SearchResponse>(FETCHX_API.SEARCH, request);
}

// Hook
export function useSearch(apiKey: string) {
  return useMutation({
    mutationFn: (request: SearchRequest) => search(apiKey, request),
  });
}

// 导出类型
export type { SearchRequest, SearchResponse };
