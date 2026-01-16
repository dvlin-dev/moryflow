/**
 * Map Playground 模块
 * 使用 Session 认证调用 Console Playground 代理接口
 */

import { useMutation } from '@tanstack/react-query';
import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import { apiClient } from '@/lib/api-client';
import type { MapRequest, MapResponse } from '@/features/playground-shared';

/**
 * Console Map 请求参数（包含 apiKeyId）
 */
interface ConsoleMapRequest extends MapRequest {
  apiKeyId: string;
}

/**
 * 执行 Map 请求
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export async function map(apiKeyId: string, request: MapRequest): Promise<MapResponse> {
  const consoleRequest: ConsoleMapRequest = {
    ...request,
    apiKeyId,
  };
  return apiClient.post<MapResponse>(CONSOLE_PLAYGROUND_API.MAP, consoleRequest);
}

/**
 * Map hook
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export function useMap(apiKeyId: string) {
  return useMutation({
    mutationFn: (request: MapRequest) => map(apiKeyId, request),
  });
}

// 导出类型
export type { MapRequest, MapResponse };
