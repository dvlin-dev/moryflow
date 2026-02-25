/**
 * Map Playground 模块
 * 使用 API Key 调用公开 Map API
 */

import { useMutation } from '@tanstack/react-query';
import { FETCHX_API } from '@/lib/api-paths';
import { createApiKeyClient } from '@/features/playground-shared/api-key-client';
import type { MapRequest, MapResponse } from '@/features/playground-shared';

/**
 * 执行 Map 请求
 * @param apiKey - 完整 API Key
 */
export async function map(apiKey: string, request: MapRequest): Promise<MapResponse> {
  const client = createApiKeyClient({ apiKey });
  return client.post<MapResponse>(FETCHX_API.MAP, request);
}

/**
 * Map hook
 * @param apiKey - 完整 API Key
 */
export function useMap(apiKey: string) {
  return useMutation({
    mutationFn: (request: MapRequest) => map(apiKey, request),
  });
}

// 导出类型
export type { MapRequest, MapResponse };
