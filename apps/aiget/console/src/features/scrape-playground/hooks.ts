/**
 * Scrape Playground Hooks
 * 使用 apiKeyId 调用 Console Playground 代理接口
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { scrape } from './api';
import type { ScrapeRequest, ScrapeResponse } from '@/features/playground-shared';

interface UseScrapeOptions {
  onSuccess?: (data: ScrapeResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Scrape hook
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export function useScrape(apiKeyId: string, options: UseScrapeOptions = {}) {
  const [progress, setProgress] = useState<ScrapeResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (request: ScrapeRequest) => {
      // Console Playground 代理是同步的，直接返回结果
      const response = await scrape(apiKeyId, request);
      setProgress(response);
      return response;
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
