/**
 * Scrape Playground API
 */

import { FETCHX_API } from '@/lib/api-paths';
import { ApiKeyClient } from '@/features/playground-shared';
import type { ScrapeRequest, ScrapeResponse } from '@/features/playground-shared';

/**
 * 执行抓取请求
 */
export async function scrape(apiKey: string, request: ScrapeRequest): Promise<ScrapeResponse> {
  const client = new ApiKeyClient({ apiKey, timeout: 120000 });
  return client.post<ScrapeResponse>(FETCHX_API.SCRAPE, request);
}

/**
 * 轮询抓取任务状态
 */
export async function getScrapeStatus(apiKey: string, jobId: string): Promise<ScrapeResponse> {
  const client = new ApiKeyClient({ apiKey });
  return client.get<ScrapeResponse>(`${FETCHX_API.SCRAPE}/${jobId}`);
}

/**
 * 轮询直到任务完成
 */
export async function pollScrapeUntilComplete(
  apiKey: string,
  jobId: string,
  options: {
    maxAttempts?: number;
    interval?: number;
    onProgress?: (response: ScrapeResponse) => void;
  } = {}
): Promise<ScrapeResponse> {
  const { maxAttempts = 60, interval = 2000, onProgress } = options;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await getScrapeStatus(apiKey, jobId);

    onProgress?.(response);

    if (response.status === 'COMPLETED' || response.status === 'FAILED') {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Scrape job timed out');
}
