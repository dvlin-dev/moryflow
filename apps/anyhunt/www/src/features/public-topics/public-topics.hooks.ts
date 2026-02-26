/**
 * [PROVIDES]: Public topics route state + methods
 * [DEPENDS]: public-topics.api, public-env-context
 * [POS]: Move request orchestration out of routes (/topics/*)
 */

import { useCallback, useEffect, useState } from 'react';
import { usePublicEnv } from '@/lib/public-env-context';
import {
  fetchEditionDetail,
  fetchPublicTopicsPage,
  fetchTopicDetail,
  fetchTopicEditionsPage,
  type DigestEditionDetail,
  type DigestEditionSummary,
  type DigestTopicDetail,
  type DigestTopicSummary,
} from './public-topics.api';

const TOPICS_PAGE_LIMIT = 20;
const TOPIC_EDITIONS_PAGE_LIMIT = 10;

function resolveErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

interface PublicTopicsDirectoryState {
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

  const loadInitialTopics = useCallback(async () => {
    setIsInitialLoading(true);
    setError(null);

    try {
      const result = await fetchPublicTopicsPage(env.apiUrl, 1, TOPICS_PAGE_LIMIT);
      setTopics(result.items);
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (requestError) {
      setError(resolveErrorMessage(requestError, 'Failed to load topics'));
      setTopics([]);
      setPage(1);
      setTotalPages(1);
    } finally {
      setIsInitialLoading(false);
    }
  }, [env.apiUrl]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isInitialLoading) return;
    if (page >= totalPages) return;

    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const result = await fetchPublicTopicsPage(env.apiUrl, nextPage, TOPICS_PAGE_LIMIT);
      setTopics((previousTopics) => [...previousTopics, ...result.items]);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (requestError) {
      setError(resolveErrorMessage(requestError, 'Failed to load topics'));
    } finally {
      setIsLoadingMore(false);
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

interface PublicTopicDetailState {
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

  const loadTopicDetail = useCallback(async () => {
    setIsInitialLoading(true);
    setError(null);

    try {
      const [topicDetail, editionsResponse] = await Promise.all([
        fetchTopicDetail(env.apiUrl, slug),
        fetchTopicEditionsPage(env.apiUrl, slug, 1, TOPIC_EDITIONS_PAGE_LIMIT),
      ]);

      setTopic(topicDetail);
      setEditions(editionsResponse.items);
      setEditionsPage(editionsResponse.page);
      setEditionsTotalPages(editionsResponse.totalPages);
    } catch (requestError) {
      setError(resolveErrorMessage(requestError, 'Failed to load topic'));
      setTopic(null);
      setEditions([]);
      setEditionsPage(1);
      setEditionsTotalPages(1);
    } finally {
      setIsInitialLoading(false);
    }
  }, [env.apiUrl, slug]);

  const loadMoreEditions = useCallback(async () => {
    if (isInitialLoading || isLoadingMoreEditions) return;
    if (editionsPage >= editionsTotalPages) return;

    setIsLoadingMoreEditions(true);

    try {
      const nextPage = editionsPage + 1;
      const result = await fetchTopicEditionsPage(env.apiUrl, slug, nextPage, TOPIC_EDITIONS_PAGE_LIMIT);

      setEditions((previousEditions) => [...previousEditions, ...result.items]);
      setEditionsPage(result.page);
      setEditionsTotalPages(result.totalPages);
      setError(null);
    } catch (requestError) {
      setError(resolveErrorMessage(requestError, 'Failed to load more editions'));
    } finally {
      setIsLoadingMoreEditions(false);
    }
  }, [
    editionsPage,
    editionsTotalPages,
    env.apiUrl,
    isInitialLoading,
    isLoadingMoreEditions,
    slug,
  ]);

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

interface PublicEditionDetailState {
  edition: DigestEditionDetail | null;
  isLoading: boolean;
  error: string | null;
}

export function usePublicEditionDetail(slug: string, editionId: string): PublicEditionDetailState {
  const env = usePublicEnv();

  const [edition, setEdition] = useState<DigestEditionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadEditionDetail = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const editionDetail = await fetchEditionDetail(env.apiUrl, slug, editionId);
        if (isCancelled) return;

        setEdition(editionDetail);
      } catch (requestError) {
        if (isCancelled) return;

        setEdition(null);
        setError(resolveErrorMessage(requestError, 'Failed to load edition'));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadEditionDetail();

    return () => {
      isCancelled = true;
    };
  }, [editionId, env.apiUrl, slug]);

  return {
    edition,
    isLoading,
    error,
  };
}
