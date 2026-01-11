/**
 * Crawl Playground Hooks
 * 使用 apiKeyId 调用 Console Playground 代理接口
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { crawl, pollCrawlUntilComplete } from './api';
import type { CrawlRequest, CrawlResponse } from '@/features/playground-shared';

interface UseCrawlOptions {
  onSuccess?: (data: CrawlResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Crawl hook
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export function useCrawl(apiKeyId: string, options: UseCrawlOptions = {}) {
  const [progress, setProgress] = useState<CrawlResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (request: CrawlRequest) => {
      const initialResponse = await crawl(apiKeyId, request);

      if (initialResponse.status === 'COMPLETED') {
        return initialResponse;
      }

      return pollCrawlUntilComplete(apiKeyId, initialResponse.id, {
        onProgress: setProgress,
      });
    },
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  const reset = useCallback(() => {
    setProgress(null);
    mutation.reset();
  }, [mutation]);

  return {
    crawl: mutation.mutate,
    crawlAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    data: mutation.data,
    error: mutation.error,
    progress,
    reset,
  };
}
