/**
 * Search Playground 模块
 * 使用 Session 认证调用 Console Playground 代理接口
 */

import { useMutation } from '@tanstack/react-query';
import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import { apiClient } from '@/lib/api-client';
import type { SearchRequest, SearchResponse } from '@/features/playground-shared';

/**
 * Console Search 请求参数（包含 apiKeyId）
 */
interface ConsoleSearchRequest extends SearchRequest {
  apiKeyId: string;
}

/**
 * 执行 Search 请求
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export async function search(apiKeyId: string, request: SearchRequest): Promise<SearchResponse> {
  const consoleRequest: ConsoleSearchRequest = {
    ...request,
    apiKeyId,
  };
  return apiClient.post<SearchResponse>(CONSOLE_PLAYGROUND_API.SEARCH, consoleRequest);
}

/**
 * Search hook
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export function useSearch(apiKeyId: string) {
  return useMutation({
    mutationFn: (request: SearchRequest) => search(apiKeyId, request),
  });
}

// 导出类型
export type { SearchRequest, SearchResponse };
