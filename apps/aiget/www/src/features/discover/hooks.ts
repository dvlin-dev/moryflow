/**
 * Discover Hooks
 *
 * [PROVIDES]: React Query hooks for discover feed and topics
 * [POS]: Data fetching hooks for homepage discover feature
 */

import { useQuery } from '@tanstack/react-query';
import * as api from './api';
import type { DiscoverFeedType } from './types';

// ========== Query Keys ==========

export const discoverKeys = {
  all: ['discover'] as const,
  feed: (type: DiscoverFeedType, limit: number) =>
    [...discoverKeys.all, 'feed', type, limit] as const,
  featuredTopics: (limit: number) => [...discoverKeys.all, 'featured-topics', limit] as const,
  trendingTopics: (limit: number) => [...discoverKeys.all, 'trending-topics', limit] as const,
};

// ========== Feed Hooks ==========

/**
 * Get discover feed (featured or trending content)
 */
export function useDiscoverFeed(type: DiscoverFeedType = 'featured', limit = 20) {
  return useQuery({
    queryKey: discoverKeys.feed(type, limit),
    queryFn: () => api.getDiscoverFeed(type, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes (match backend cache)
  });
}

/**
 * Get featured topics for sidebar
 */
export function useFeaturedTopics(limit = 5) {
  return useQuery({
    queryKey: discoverKeys.featuredTopics(limit),
    queryFn: () => api.getFeaturedTopics(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get trending topics
 */
export function useTrendingTopics(limit = 10) {
  return useQuery({
    queryKey: discoverKeys.trendingTopics(limit),
    queryFn: () => api.getTrendingTopics(limit),
    staleTime: 5 * 60 * 1000,
  });
}
