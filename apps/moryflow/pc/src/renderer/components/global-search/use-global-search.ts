/**
 * [PROVIDES]: useGlobalSearch - 全局搜索查询状态与并发治理
 * [DEPENDS]: desktopAPI.search IPC
 * [POS]: GlobalSearchPanel 数据层
 */

import { useEffect, useRef, useState } from 'react';
import type { SearchFileHit, SearchThreadHit } from '@shared/ipc';
import {
  GLOBAL_SEARCH_DEBOUNCE_MS,
  GLOBAL_SEARCH_LIMIT_PER_GROUP,
  GLOBAL_SEARCH_MIN_QUERY_LENGTH,
} from './const';

type GlobalSearchState = {
  query: string;
  setQuery: (query: string) => void;
  loading: boolean;
  error: string | null;
  files: SearchFileHit[];
  threads: SearchThreadHit[];
  hasEnoughQuery: boolean;
};

export const useGlobalSearch = (open: boolean): GlobalSearchState => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<SearchFileHit[]>([]);
  const [threads, setThreads] = useState<SearchThreadHit[]>([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (open) {
      return;
    }
    setQuery('');
    setLoading(false);
    setError(null);
    setFiles([]);
    setThreads([]);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < GLOBAL_SEARCH_MIN_QUERY_LENGTH) {
      setLoading(false);
      setError(null);
      setFiles([]);
      setThreads([]);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(() => {
      const api = window.desktopAPI?.search;
      if (!api) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setLoading(false);
        setError('Search API is unavailable.');
        return;
      }

      void api
        .query({
          query: trimmed,
          limitPerGroup: GLOBAL_SEARCH_LIMIT_PER_GROUP,
        })
        .then((result) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setFiles(result.files);
          setThreads(result.threads);
          setLoading(false);
        })
        .catch((queryError) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setLoading(false);
          setError(queryError instanceof Error ? queryError.message : String(queryError));
          setFiles([]);
          setThreads([]);
        });
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, query]);

  return {
    query,
    setQuery,
    loading,
    error,
    files,
    threads,
    hasEnoughQuery: query.trim().length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  };
};
