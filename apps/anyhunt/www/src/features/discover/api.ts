/**
 * Discover API Client
 *
 * [PROVIDES]: Discover Feed 和 Topics API 调用
 * [POS]: 无需认证的公开 API
 */

import { apiClient } from '@/lib/api-client';
import { DISCOVER_API } from '@/lib/api-paths';
import type {
  DiscoverFeedResponse,
  DiscoverFeedType,
  DiscoverFeaturedTopicsResponse,
  DiscoverTrendingTopicsResponse,
} from './types';

// ========== Helper ==========

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

// ========== API Functions ==========

/**
 * Get discover feed (featured or trending content)
 */
export async function getDiscoverFeed(
  type: DiscoverFeedType = 'featured',
  limit = 20
): Promise<DiscoverFeedResponse> {
  const query = buildQueryString({ type, limit });
  const url = `${DISCOVER_API.FEED}?${query}`;
  return apiClient.get<DiscoverFeedResponse>(url);
}

/**
 * Get featured topics for sidebar
 */
export async function getFeaturedTopics(limit = 5): Promise<DiscoverFeaturedTopicsResponse> {
  const query = buildQueryString({ limit });
  const url = `${DISCOVER_API.FEATURED_TOPICS}?${query}`;
  return apiClient.get<DiscoverFeaturedTopicsResponse>(url);
}

/**
 * Get trending topics
 */
export async function getTrendingTopics(limit = 10): Promise<DiscoverTrendingTopicsResponse> {
  const query = buildQueryString({ limit });
  const url = `${DISCOVER_API.TRENDING_TOPICS}?${query}`;
  return apiClient.get<DiscoverTrendingTopicsResponse>(url);
}
