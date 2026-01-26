/**
 * Crawl Playground Hooks
 * 使用 API Key 调用公开 Crawl API
 */

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { crawl } from './api';
import type { CrawlRequest, CrawlResponse } from '@/features/playground-shared';

interface UseCrawlOptions {
  onSuccess?: (data: CrawlResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Crawl hook（同步模式，直接返回结果）
 * @param apiKey - 完整 API Key
 */
export function useCrawl(apiKey: string, options: UseCrawlOptions = {}) {
  const mutation = useMutation({
    mutationFn: (request: CrawlRequest) => crawl(apiKey, request),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });

  const reset = useCallback(() => {
    mutation.reset();
  }, [mutation]);

  return {
    crawl: mutation.mutate,
    crawlAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    data: mutation.data,
    error: mutation.error,
    reset,
  };
}
