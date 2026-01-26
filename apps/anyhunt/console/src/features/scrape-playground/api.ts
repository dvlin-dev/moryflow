/**
 * Scrape Playground API
 * 使用 API Key 调用公开 Scrape 接口
 */

import { FETCHX_API } from '@/lib/api-paths';
import { ApiKeyClient } from '@/features/playground-shared/api-key-client';
import type { ScrapeRequest, ScrapeResponse } from '@/features/playground-shared';

/**
 * 执行抓取请求
 */
export async function scrape(apiKey: string, request: ScrapeRequest): Promise<ScrapeResponse> {
  const client = new ApiKeyClient({ apiKey });
  return client.post<ScrapeResponse>(FETCHX_API.SCRAPE, request);
}
