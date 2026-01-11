/**
 * Crawl Playground API
 */

import { FETCHX_API } from '@/lib/api-paths';
import { ApiKeyClient } from '@/features/playground-shared';
import type { CrawlRequest, CrawlResponse } from '@/features/playground-shared';

/**
 * 执行爬取请求
 */
export async function crawl(apiKey: string, request: CrawlRequest): Promise<CrawlResponse> {
  const client = new ApiKeyClient({ apiKey, timeout: 300000 });
  return client.post<CrawlResponse>(FETCHX_API.CRAWL, request);
}

/**
 * 获取爬取任务状态
 */
export async function getCrawlStatus(apiKey: string, jobId: string): Promise<CrawlResponse> {
  const client = new ApiKeyClient({ apiKey });
  return client.get<CrawlResponse>(`${FETCHX_API.CRAWL}/${jobId}`);
}

/**
 * 取消爬取任务
 */
export async function cancelCrawl(apiKey: string, jobId: string): Promise<void> {
  const client = new ApiKeyClient({ apiKey });
  await client.request(`${FETCHX_API.CRAWL}/${jobId}`, { method: 'DELETE' });
}

/**
 * 轮询直到任务完成
 */
export async function pollCrawlUntilComplete(
  apiKey: string,
  jobId: string,
  options: {
    maxAttempts?: number;
    interval?: number;
    onProgress?: (response: CrawlResponse) => void;
  } = {}
): Promise<CrawlResponse> {
  const { maxAttempts = 120, interval = 3000, onProgress } = options;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await getCrawlStatus(apiKey, jobId);

    onProgress?.(response);

    if (response.status === 'COMPLETED' || response.status === 'FAILED') {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Crawl job timed out');
}
