/**
 * Extract Playground 模块
 * 使用 API Key 调用公开 Extract API
 */

import { useMutation } from '@tanstack/react-query';
import { FETCHX_API } from '@/lib/api-paths';
import { createApiKeyClient } from '@/features/playground-shared/api-key-client';
import type { ExtractRequest, ExtractResponse } from '@/features/playground-shared';

/**
 * 执行 Extract 请求
 * @param apiKey - 完整 API Key
 */
export async function extract(apiKey: string, request: ExtractRequest): Promise<ExtractResponse> {
  const client = createApiKeyClient({ apiKey });
  return client.post<ExtractResponse>(FETCHX_API.EXTRACT, request);
}

/**
 * Extract hook
 * @param apiKey - 完整 API Key
 */
export function useExtract(apiKey: string) {
  return useMutation({
    mutationFn: (request: ExtractRequest) => extract(apiKey, request),
  });
}

// 导出类型
export type { ExtractRequest, ExtractResponse };
