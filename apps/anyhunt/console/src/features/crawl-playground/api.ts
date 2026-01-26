/**
 * Crawl Playground API
 * 使用 API Key 调用公开 Crawl API
 */

import { FETCHX_API } from '@/lib/api-paths';
import { ApiKeyClient } from '@/features/playground-shared/api-key-client';
import type { CrawlRequest, CrawlResponse } from '@/features/playground-shared';

/**
 * 执行爬取请求（同步模式，直接返回结果）
 */
export async function crawl(apiKey: string, request: CrawlRequest): Promise<CrawlResponse> {
  const client = new ApiKeyClient({ apiKey });
  return client.post<CrawlResponse>(FETCHX_API.CRAWL, request);
}
