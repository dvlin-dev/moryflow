/**
 * Crawl Playground Hooks
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { crawl, pollCrawlUntilComplete } from './api';
import type { CrawlRequest, CrawlResponse } from '@/features/playground-shared';

interface UseCrawlOptions {
  onSuccess?: (data: CrawlResponse) => void;
  onError?: (error: Error) => void;
}

export function useCrawl(apiKey: string, options: UseCrawlOptions = {}) {
  const [progress, setProgress] = useState<CrawlResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (request: CrawlRequest) => {
      const initialResponse = await crawl(apiKey, request);

      if (initialResponse.status === 'COMPLETED') {
        return initialResponse;
      }

      return pollCrawlUntilComplete(apiKey, initialResponse.id, {
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
