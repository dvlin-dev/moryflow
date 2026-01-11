/**
 * Map Playground 模块
 */

import { useMutation } from '@tanstack/react-query';
import { FETCHX_API } from '@/lib/api-paths';
import { ApiKeyClient, type MapRequest, type MapResponse } from '@/features/playground-shared';

// API
export async function map(apiKey: string, request: MapRequest): Promise<MapResponse> {
  const client = new ApiKeyClient({ apiKey, timeout: 60000 });
  return client.post<MapResponse>(FETCHX_API.MAP, request);
}

// Hook
export function useMap(apiKey: string) {
  return useMutation({
    mutationFn: (request: MapRequest) => map(apiKey, request),
  });
}

// 导出类型
export type { MapRequest, MapResponse };
