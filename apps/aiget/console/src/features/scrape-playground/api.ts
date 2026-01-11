/**
 * Scrape Playground API
 * 使用 Session 认证调用 Console Playground 代理接口
 */

import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import { apiClient } from '@/lib/api-client';
import type { ScrapeRequest, ScrapeResponse } from '@/features/playground-shared';

/**
 * Console Scrape 请求参数（包含 apiKeyId）
 */
interface ConsoleScrapeRequest extends ScrapeRequest {
  apiKeyId: string;
}

/**
 * 执行抓取请求
 */
export async function scrape(apiKeyId: string, request: ScrapeRequest): Promise<ScrapeResponse> {
  const consoleRequest: ConsoleScrapeRequest = {
    ...request,
    apiKeyId,
  };
  return apiClient.post<ScrapeResponse>(CONSOLE_PLAYGROUND_API.SCRAPE, consoleRequest);
}
