/**
 * Crawl Playground API
 * 使用 Session 认证调用 Console Playground 代理接口
 * Console Playground 强制同步模式，直接返回完整结果
 */

import { CONSOLE_PLAYGROUND_API } from '@/lib/api-paths';
import { apiClient } from '@/lib/api-client';
import type { CrawlRequest, CrawlResponse } from '@/features/playground-shared';

/**
 * Console Crawl 请求参数（包含 apiKeyId）
 */
interface ConsoleCrawlRequest extends CrawlRequest {
  apiKeyId: string;
}

/**
 * 执行爬取请求（同步模式，直接返回结果）
 */
export async function crawl(apiKeyId: string, request: CrawlRequest): Promise<CrawlResponse> {
  const consoleRequest: ConsoleCrawlRequest = {
    ...request,
    apiKeyId,
  };
  return apiClient.post<CrawlResponse>(CONSOLE_PLAYGROUND_API.CRAWL, consoleRequest);
}
