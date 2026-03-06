/**
 * [PROVIDES]: useEmbed
 * [DEPENDS]: useEmbedContext, @moryflow/embed
 * [POS]: oEmbed 获取 Hook
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed-react/CLAUDE.md
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { EmbedData, EmbedOptions, EmbedError } from '@moryflow/embed';
import { useEmbedContext } from './useEmbedContext';

export interface UseEmbedOptions extends EmbedOptions {
  /** 是否启用请求，默认 true */
  enabled?: boolean;
}

export interface UseEmbedResult {
  data: EmbedData | null;
  isLoading: boolean;
  error: EmbedError | null;
  refetch: () => void;
}

export function useEmbed(url: string | undefined, options?: UseEmbedOptions): UseEmbedResult {
  const { client, theme: globalTheme } = useEmbedContext();
  const [data, setData] = useState<EmbedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<EmbedError | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const { enabled = true, theme, maxWidth, maxHeight } = options || {};
  const effectiveTheme = theme ?? globalTheme;

  // 使用 ref 避免 fetchData 依赖变化导致的重复请求
  const optionsRef = useRef({ maxWidth, maxHeight, effectiveTheme });
  optionsRef.current = { maxWidth, maxHeight, effectiveTheme };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current || !url || !client || !enabled) return;
    const requestId = ++requestIdRef.current;
    const shouldUpdate = () => isMountedRef.current && requestId === requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const { maxWidth, maxHeight, effectiveTheme } = optionsRef.current;
      const result = await client.fetch(url, {
        maxWidth,
        maxHeight,
        theme: effectiveTheme,
      });
      if (shouldUpdate()) {
        setData(result);
      }
    } catch (err) {
      if (shouldUpdate()) {
        setError(err as EmbedError);
        setData(null);
      }
    } finally {
      if (shouldUpdate()) {
        setIsLoading(false);
      }
    }
  }, [url, client, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
