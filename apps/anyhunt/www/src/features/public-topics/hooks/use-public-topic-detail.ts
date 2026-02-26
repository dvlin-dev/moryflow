/**
 * [PROVIDES]: Public topic detail state + editions pagination method
 * [DEPENDS]: public-topics.api, public-env-context, request-guard
 * [POS]: Public topic detail route orchestration
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePublicEnv } from '@/lib/public-env-context';
import {
  fetchTopicDetail,
  fetchTopicEditionsPage,
  type DigestEditionSummary,
  type DigestTopicDetail,
} from '../public-topics.api';
import {
  createRequestGenerationGuard,
  isAbortRequestError,
  shouldSkipPaginationLoad,
} from '../public-topics.request-guard';
import { TOPIC_EDITIONS_PAGE_LIMIT } from './constants';
import { resolvePublicTopicsErrorMessage } from './error-message';

export interface PublicTopicDetailState {
  topic: DigestTopicDetail | null;
  editions: DigestEditionSummary[];
  editionsPage: number;
  editionsTotalPages: number;
  isInitialLoading: boolean;
  isLoadingMoreEditions: boolean;
  error: string | null;
  loadMoreEditions: () => Promise<void>;
}

export function usePublicTopicDetail(slug: string): PublicTopicDetailState {
  const env = usePublicEnv();

  const [topic, setTopic] = useState<DigestTopicDetail | null>(null);
  const [editions, setEditions] = useState<DigestEditionSummary[]>([]);
  const [editionsPage, setEditionsPage] = useState(1);
  const [editionsTotalPages, setEditionsTotalPages] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMoreEditions, setIsLoadingMoreEditions] = useState(false);
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

  const loadTopicDetail = useCallback(async () => {
    const generation = generationRef.current.next();

    abortAllRequests();
    const controller = new AbortController();
    initialRequestControllerRef.current = controller;

    setIsInitialLoading(true);
    setIsLoadingMoreEditions(false);
    setError(null);

    try {
      const [topicDetail, editionsResponse] = await Promise.all([
        fetchTopicDetail(env.apiUrl, slug, controller.signal),
        fetchTopicEditionsPage(env.apiUrl, slug, 1, TOPIC_EDITIONS_PAGE_LIMIT, controller.signal),
      ]);

      if (!generationRef.current.isCurrent(generation) || controller.signal.aborted) {
        return;
      }

      setTopic(topicDetail);
      setEditions(editionsResponse.items);
      setEditionsPage(editionsResponse.page);
      setEditionsTotalPages(editionsResponse.totalPages);
    } catch (requestError) {
      if (isAbortRequestError(requestError)) {
        return;
      }

      if (!generationRef.current.isCurrent(generation)) {
        return;
      }

      setError(resolvePublicTopicsErrorMessage(requestError, 'Failed to load topic'));
      setTopic(null);
      setEditions([]);
      setEditionsPage(1);
      setEditionsTotalPages(1);
    } finally {
      if (initialRequestControllerRef.current === controller) {
        initialRequestControllerRef.current = null;
      }

      if (generationRef.current.isCurrent(generation) && !controller.signal.aborted) {
        setIsInitialLoading(false);
      }
    }
  }, [abortAllRequests, env.apiUrl, slug]);

  const loadMoreEditions = useCallback(async () => {
    if (
      shouldSkipPaginationLoad({
        isInitialLoading,
        isLoadingMore: isLoadingMoreEditions,
        page: editionsPage,
        totalPages: editionsTotalPages,
      })
    ) {
      return;
    }

    if (loadMoreControllerRef.current && !loadMoreControllerRef.current.signal.aborted) {
      return;
    }

    const generation = generationRef.current.current();
    const nextPage = editionsPage + 1;
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;

    setIsLoadingMoreEditions(true);

    try {
      const result = await fetchTopicEditionsPage(
        env.apiUrl,
        slug,
        nextPage,
        TOPIC_EDITIONS_PAGE_LIMIT,
        controller.signal
      );

      if (!generationRef.current.isCurrent(generation) || controller.signal.aborted) {
        return;
      }

      setEditions((previousEditions) => [...previousEditions, ...result.items]);
      setEditionsPage(result.page);
      setEditionsTotalPages(result.totalPages);
      setError(null);
    } catch (requestError) {
      if (isAbortRequestError(requestError)) {
        return;
      }

      if (!generationRef.current.isCurrent(generation)) {
        return;
      }

      setError(resolvePublicTopicsErrorMessage(requestError, 'Failed to load more editions'));
    } finally {
      if (loadMoreControllerRef.current === controller) {
        loadMoreControllerRef.current = null;
      }

      if (generationRef.current.isCurrent(generation) && !controller.signal.aborted) {
        setIsLoadingMoreEditions(false);
      }
    }
  }, [editionsPage, editionsTotalPages, env.apiUrl, isInitialLoading, isLoadingMoreEditions, slug]);

  useEffect(() => {
    void loadTopicDetail();
  }, [loadTopicDetail]);

  return {
    topic,
    editions,
    editionsPage,
    editionsTotalPages,
    isInitialLoading,
    isLoadingMoreEditions,
    error,
    loadMoreEditions,
  };
}
