/**
 * Extract Playground 模块
 * 使用 Session 认证调用 Console Playground 代理接口
 */

import { useMutation } from '@tanstack/react-query';
import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import { apiClient } from '@/lib/api-client';
import type { ExtractRequest, ExtractResponse } from '@/features/playground-shared';

/**
 * Console Extract 请求参数（包含 apiKeyId）
 */
interface ConsoleExtractRequest extends ExtractRequest {
  apiKeyId: string;
}

/**
 * 执行 Extract 请求
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export async function extract(apiKeyId: string, request: ExtractRequest): Promise<ExtractResponse> {
  const consoleRequest: ConsoleExtractRequest = {
    ...request,
    apiKeyId,
  };
  return apiClient.post<ExtractResponse>(CONSOLE_PLAYGROUND_API.EXTRACT, consoleRequest);
}

/**
 * Extract hook
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export function useExtract(apiKeyId: string) {
  return useMutation({
    mutationFn: (request: ExtractRequest) => extract(apiKeyId, request),
  });
}

// 导出类型
export type { ExtractRequest, ExtractResponse };
