/**
 * [PROVIDES]: useGlobalSearch - 全局搜索查询状态与并发治理
 * [DEPENDS]: desktopAPI.search IPC, desktopAPI.memory IPC
 * [POS]: GlobalSearchPanel 数据层
 */

import { useEffect, useRef, useState } from 'react';
import type {
  MemorySearchFactItem,
  MemorySearchFileItem,
  SearchFileHit,
  SearchThreadHit,
} from '@shared/ipc';
import { useAuthStore } from '@/lib/server/auth-store';
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
  localUnavailable: string | null;
  memoryUnavailable: string | null;
  files: SearchFileHit[];
  threads: SearchThreadHit[];
  memoryFiles: MemorySearchFileItem[];
  memoryFacts: MemorySearchFactItem[];
  hasEnoughQuery: boolean;
};

export const useGlobalSearch = (open: boolean): GlobalSearchState => {
  const isAuthenticated = useAuthStore((s) => Boolean(s.user));
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localUnavailable, setLocalUnavailable] = useState<string | null>(null);
  const [memoryUnavailable, setMemoryUnavailable] = useState<string | null>(null);
  const [files, setFiles] = useState<SearchFileHit[]>([]);
  const [threads, setThreads] = useState<SearchThreadHit[]>([]);
  const [memoryFiles, setMemoryFiles] = useState<MemorySearchFileItem[]>([]);
  const [memoryFacts, setMemoryFacts] = useState<MemorySearchFactItem[]>([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (open) {
      return;
    }
    setQuery('');
    setLoading(false);
    setError(null);
    setLocalUnavailable(null);
    setMemoryUnavailable(null);
    setFiles([]);
    setThreads([]);
    setMemoryFiles([]);
    setMemoryFacts([]);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < GLOBAL_SEARCH_MIN_QUERY_LENGTH) {
      setLoading(false);
      setError(null);
      setLocalUnavailable(null);
      setMemoryUnavailable(null);
      setFiles([]);
      setThreads([]);
      setMemoryFiles([]);
      setMemoryFacts([]);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setLocalUnavailable(null);
    setMemoryUnavailable(null);

    const timer = window.setTimeout(() => {
      const searchApi = window.desktopAPI?.search;
      const memoryApi = window.desktopAPI?.memory;

      void Promise.allSettled([
        searchApi
          ? searchApi.query({
              query: trimmed,
              limitPerGroup: GLOBAL_SEARCH_LIMIT_PER_GROUP,
            })
          : Promise.reject(new Error('Local search is unavailable.')),
        memoryApi && isAuthenticated
          ? memoryApi.search({
              query: trimmed,
              limitPerGroup: GLOBAL_SEARCH_LIMIT_PER_GROUP,
              includeGraphContext: false,
            })
          : Promise.reject(new Error('Memory search unavailable')),
      ])
        .then(([localResult, memoryResult]) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          if (localResult.status === 'fulfilled') {
            setFiles(localResult.value.files);
            setThreads(localResult.value.threads);
            setLocalUnavailable(null);
          } else {
            setFiles([]);
            setThreads([]);
            setLocalUnavailable(
              localResult.reason instanceof Error
                ? localResult.reason.message
                : String(localResult.reason)
            );
          }
          if (memoryResult.status === 'fulfilled') {
            setMemoryFiles(memoryResult.value.groups.files.items);
            setMemoryFacts(memoryResult.value.groups.facts.items);
            setMemoryUnavailable(null);
          } else {
            setMemoryFiles([]);
            setMemoryFacts([]);
            setMemoryUnavailable(
              memoryResult.reason instanceof Error
                ? memoryResult.reason.message
                : String(memoryResult.reason)
            );
          }
          if (localResult.status === 'rejected' && memoryResult.status === 'rejected') {
            const cause = localResult.reason ?? memoryResult.reason;
            setError(cause instanceof Error ? cause.message : String(cause));
          } else {
            setError(null);
          }
          setLoading(false);
        })
        .catch((queryError) => {
          if (requestIdRef.current !== requestId) {
            return;
          }
          setLoading(false);
          setError(queryError instanceof Error ? queryError.message : String(queryError));
          setLocalUnavailable(null);
          setMemoryUnavailable(null);
          setFiles([]);
          setThreads([]);
          setMemoryFiles([]);
          setMemoryFacts([]);
        });
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, query, isAuthenticated]);

  return {
    query,
    setQuery,
    loading,
    error,
    localUnavailable,
    memoryUnavailable,
    files,
    threads,
    memoryFiles,
    memoryFacts,
    hasEnoughQuery: query.trim().length >= GLOBAL_SEARCH_MIN_QUERY_LENGTH,
  };
};
