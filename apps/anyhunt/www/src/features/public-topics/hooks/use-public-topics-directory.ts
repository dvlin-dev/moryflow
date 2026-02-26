/**
 * [PROVIDES]: Public topics directory state + pagination method
 * [DEPENDS]: public-topics.api, public-env-context, request-guard
 * [POS]: Public topics list route orchestration
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePublicEnv } from '@/lib/public-env-context';
import { fetchPublicTopicsPage, type DigestTopicSummary } from '../public-topics.api';
import {
  createRequestGenerationGuard,
  isAbortRequestError,
  shouldSkipPaginationLoad,
} from '../public-topics.request-guard';
import { TOPICS_PAGE_LIMIT } from './constants';
import { resolvePublicTopicsErrorMessage } from './error-message';

export interface PublicTopicsDirectoryState {
  topics: DigestTopicSummary[];
  page: number;
  totalPages: number;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
}

export function usePublicTopicsDirectory(): PublicTopicsDirectoryState {
  const env = usePublicEnv();

  const [topics, setTopics] = useState<DigestTopicSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generationRef = useRef(createRequestGenerationGuard());
  const initialRequestControllerRef = useRef<AbortController | null>(null);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  const abortAllRequests = useCallback(() => {
    initialRequestControllerRef.current?.abort();
    loadMoreControllerRef.current?.abort();
    initialRequestControllerRef.current = null;
    loadMoreControllerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortAllRequests();
      generationRef.current.next();
    };
  }, [abortAllRequests]);

  const loadInitialTopics = useCallback(async () => {
    const generation = generationRef.current.next();

    abortAllRequests();
    const controller = new AbortController();
    initialRequestControllerRef.current = controller;

    setIsInitialLoading(true);
    setIsLoadingMore(false);
    setError(null);

    try {
      const result = await fetchPublicTopicsPage(env.apiUrl, 1, TOPICS_PAGE_LIMIT, controller.signal);

      if (!generationRef.current.isCurrent(generation) || controller.signal.aborted) {
        return;
      }

      setTopics(result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (requestError) {
      if (isAbortRequestError(requestError)) {
        return;
      }

      if (!generationRef.current.isCurrent(generation)) {
        return;
      }

      setError(resolvePublicTopicsErrorMessage(requestError, 'Failed to load topics'));
      setTopics([]);
      setPage(1);
      setTotalPages(1);
    } finally {
      if (initialRequestControllerRef.current === controller) {
        initialRequestControllerRef.current = null;
      }

      if (generationRef.current.isCurrent(generation) && !controller.signal.aborted) {
        setIsInitialLoading(false);
      }
    }
  }, [abortAllRequests, env.apiUrl]);

  const loadMore = useCallback(async () => {
    if (
      shouldSkipPaginationLoad({
        isInitialLoading,
        isLoadingMore,
        page,
        totalPages,
      })
    ) {
      return;
    }

    if (loadMoreControllerRef.current && !loadMoreControllerRef.current.signal.aborted) {
      return;
    }

    const generation = generationRef.current.current();
    const nextPage = page + 1;
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;

    setIsLoadingMore(true);

    try {
      const result = await fetchPublicTopicsPage(
        env.apiUrl,
        nextPage,
        TOPICS_PAGE_LIMIT,
        controller.signal
      );

      if (!generationRef.current.isCurrent(generation) || controller.signal.aborted) {
        return;
      }

      setTopics((previousTopics) => [...previousTopics, ...result.items]);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (requestError) {
      if (isAbortRequestError(requestError)) {
        return;
      }

      if (!generationRef.current.isCurrent(generation)) {
        return;
      }

      setError(resolvePublicTopicsErrorMessage(requestError, 'Failed to load topics'));
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
      }

      if (generationRef.current.isCurrent(generation) && !controller.signal.aborted) {
        setIsLoadingMore(false);
      }
    }
  }, [env.apiUrl, isInitialLoading, isLoadingMore, page, totalPages]);

  useEffect(() => {
    void loadInitialTopics();
  }, [loadInitialTopics]);

  return {
    topics,
    page,
    totalPages,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
  };
}
