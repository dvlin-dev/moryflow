/**
 * Search Playground 模块
 * 使用 API Key 调用公开 Search API
 */

import { useMutation } from '@tanstack/react-query';
import { FETCHX_API } from '@/lib/api-paths';
import { ApiKeyClient } from '@/features/playground-shared/api-key-client';
import type { SearchRequest, SearchResponse } from '@/features/playground-shared';

/**
 * 执行 Search 请求
 * @param apiKey - 完整 API Key
 */
export async function search(apiKey: string, request: SearchRequest): Promise<SearchResponse> {
  const client = new ApiKeyClient({ apiKey });
  return client.post<SearchResponse>(FETCHX_API.SEARCH, request);
}

/**
 * Search hook
 * @param apiKey - 完整 API Key
 */
export function useSearch(apiKey: string) {
  return useMutation({
    mutationFn: (request: SearchRequest) => search(apiKey, request),
  });
}

// 导出类型
export type { SearchRequest, SearchResponse };
