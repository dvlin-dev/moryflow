/**
 * Scrape Playground Hooks
 * 使用 API Key 调用公开 Scrape API
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
 * @param apiKey - 完整 API Key
 */
export function useScrape(apiKey: string, options: UseScrapeOptions = {}) {
  const [progress, setProgress] = useState<ScrapeResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async (request: ScrapeRequest) => {
      const response = await scrape(apiKey, request);
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
