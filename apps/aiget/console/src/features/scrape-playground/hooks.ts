/**
 * Scrape Playground Hooks
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { scrape, pollScrapeUntilComplete } from './api';
import type { ScrapeRequest, ScrapeResponse } from '@/features/playground-shared';

interface UseScrapeOptions {
  onSuccess?: (data: ScrapeResponse) => void;
  onError?: (error: Error) => void;
}

export function useScrape(apiKey: string, options: UseScrapeOptions = {}) {
  const [progress, setProgress] = useState<ScrapeResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (request: ScrapeRequest) => {
      // 首先提交抓取请求
      const initialResponse = await scrape(apiKey, request);

      // 如果是缓存命中，直接返回
      if (initialResponse.fromCache || initialResponse.status === 'COMPLETED') {
        return initialResponse;
      }

      // 否则轮询直到完成
      return pollScrapeUntilComplete(apiKey, initialResponse.id, {
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
    scrape: mutation.mutate,
    scrapeAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    data: mutation.data,
    error: mutation.error,
    progress,
    reset,
  };
}
