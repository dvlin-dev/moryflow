/**
 * Crawl Playground Hooks
 * 使用 apiKeyId 调用 Console Playground 代理接口
 * Console Playground 强制同步模式，无需轮询
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
 * @param apiKeyId - API Key 的 UUID（不是 keyPrefix）
 */
export function useCrawl(apiKeyId: string, options: UseCrawlOptions = {}) {
  const mutation = useMutation({
    // 同步模式，直接返回结果
    mutationFn: (request: CrawlRequest) => crawl(apiKeyId, request),
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
