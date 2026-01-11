/**
 * Crawl Playground API
 * 使用 Session 认证调用 Console Playground 代理接口
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
 * 执行爬取请求
 */
export async function crawl(apiKeyId: string, request: CrawlRequest): Promise<CrawlResponse> {
  const consoleRequest: ConsoleCrawlRequest = {
    ...request,
    apiKeyId,
  };
  return apiClient.post<CrawlResponse>(CONSOLE_PLAYGROUND_API.CRAWL, consoleRequest);
}

/**
 * 获取爬取任务状态
 */
export async function getCrawlStatus(apiKeyId: string, jobId: string): Promise<CrawlResponse> {
  return apiClient.get<CrawlResponse>(
    `${CONSOLE_PLAYGROUND_API.CRAWL}/${jobId}?apiKeyId=${apiKeyId}`
  );
}

/**
 * 取消爬取任务
 */
export async function cancelCrawl(apiKeyId: string, jobId: string): Promise<void> {
  await apiClient.delete(`${CONSOLE_PLAYGROUND_API.CRAWL}/${jobId}?apiKeyId=${apiKeyId}`);
}

/**
 * 轮询直到任务完成
 */
export async function pollCrawlUntilComplete(
  apiKeyId: string,
  jobId: string,
  options: {
    maxAttempts?: number;
    interval?: number;
    onProgress?: (response: CrawlResponse) => void;
  } = {}
): Promise<CrawlResponse> {
  const { maxAttempts = 120, interval = 3000, onProgress } = options;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await getCrawlStatus(apiKeyId, jobId);

    onProgress?.(response);

    if (response.status === 'COMPLETED' || response.status === 'FAILED') {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Crawl job timed out');
}
