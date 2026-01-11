/**
 * Extract Playground 模块
 */

import { useMutation } from '@tanstack/react-query';
import { FETCHX_API } from '@/lib/api-paths';
import {
  ApiKeyClient,
  type ExtractRequest,
  type ExtractResponse,
} from '@/features/playground-shared';

// API
export async function extract(apiKey: string, request: ExtractRequest): Promise<ExtractResponse> {
  const client = new ApiKeyClient({ apiKey, timeout: 120000 });
  return client.post<ExtractResponse>(FETCHX_API.EXTRACT, request);
}

// Hook
export function useExtract(apiKey: string) {
  return useMutation({
    mutationFn: (request: ExtractRequest) => extract(apiKey, request),
  });
}

// 导出类型
export type { ExtractRequest, ExtractResponse };
