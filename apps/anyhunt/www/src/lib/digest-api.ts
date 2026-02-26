/**
 * Digest Public API Client
 *
 * [PROVIDES]: Public topic/edition API calls for anyhunt.app
 * [POS]: API client for public digest pages (no auth required)
 */

import { getPublicApiClient } from './public-api-client';

// ============== Types ==============

export type DigestTopicVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type DigestTopicStatus = 'ACTIVE' | 'PAUSED_INSUFFICIENT_CREDITS' | 'PAUSED_BY_ADMIN';

export interface DigestTopicSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  subscriberCount: number;
  lastEditionAt: string | null;
  createdAt: string;
}

export interface DigestTopicDetail extends DigestTopicSummary {
  visibility: DigestTopicVisibility;
  status: DigestTopicStatus;
  topic: string;
  interests: string[];
  locale: string;
  cron: string;
  timezone: string;
  createdByUserId: string | null;
}

export interface DigestEditionSummary {
  id: string;
  topicId: string;
  scheduledAt: string;
  finishedAt: string | null;
  outputLocale: string;
  narrativeMarkdown: string | null;
  itemCount: number;
}

export interface DigestEditionItem {
  id: string;
  rank: number;
  scoreOverall: number;
  titleSnapshot: string;
  urlSnapshot: string;
  aiSummarySnapshot: string | null;
  siteName: string | null;
  favicon: string | null;
}

export interface DigestEditionDetail extends DigestEditionSummary {
  items: DigestEditionItem[];
}

export type ReportReason = 'SPAM' | 'COPYRIGHT' | 'INAPPROPRIATE' | 'MISLEADING' | 'OTHER';

export interface CreateReportInput {
  reason: ReportReason;
  description?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============== API Functions ==============

export type TopicSort = 'trending' | 'latest' | 'most_followed' | 'quality';

/**
 * Get public topics list
 */
export async function getPublicTopics(
  apiUrl: string,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: TopicSort;
    featured?: boolean;
    signal?: AbortSignal;
  }
): Promise<PaginatedResponse<DigestTopicSummary>> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.search) params.set('q', options.search);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.featured !== undefined) params.set('featured', options.featured.toString());

  const client = getPublicApiClient(apiUrl);
  return client.get<PaginatedResponse<DigestTopicSummary>>(`/api/v1/public/digest/topics`, {
    query: Object.fromEntries(params.entries()),
    authMode: 'public',
    signal: options?.signal,
  });
}

/**
 * Get featured topics (convenience wrapper)
 */
export async function getFeaturedTopics(apiUrl: string, limit = 6): Promise<DigestTopicSummary[]> {
  const result = await getPublicTopics(apiUrl, { featured: true, limit });
  return result.items;
}

/**
 * Get trending topics (convenience wrapper)
 */
export async function getTrendingTopics(apiUrl: string, limit = 8): Promise<DigestTopicSummary[]> {
  const result = await getPublicTopics(apiUrl, { sort: 'trending', limit });
  return result.items;
}

/**
 * Get latest topics (convenience wrapper)
 */
export async function getLatestTopics(apiUrl: string, limit = 8): Promise<DigestTopicSummary[]> {
  const result = await getPublicTopics(apiUrl, { sort: 'latest', limit });
  return result.items;
}

/**
 * Get single topic by slug
 */
export async function getTopicBySlug(
  apiUrl: string,
  slug: string,
  options?: { signal?: AbortSignal }
): Promise<DigestTopicDetail> {
  const client = getPublicApiClient(apiUrl);
  return client.get<DigestTopicDetail>(`/api/v1/public/digest/topics/${slug}`, {
    authMode: 'public',
    signal: options?.signal,
  });
}

/**
 * Get topic editions list
 */
export async function getTopicEditions(
  apiUrl: string,
  slug: string,
  options?: {
    page?: number;
    limit?: number;
    signal?: AbortSignal;
  }
): Promise<PaginatedResponse<DigestEditionSummary>> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());

  const client = getPublicApiClient(apiUrl);
  return client.get<PaginatedResponse<DigestEditionSummary>>(
    `/api/v1/public/digest/topics/${slug}/editions`,
    {
      query: Object.fromEntries(params.entries()),
      authMode: 'public',
      signal: options?.signal,
    }
  );
}

/**
 * Get single edition by ID
 */
export async function getEditionById(
  apiUrl: string,
  slug: string,
  editionId: string,
  options?: { signal?: AbortSignal }
): Promise<DigestEditionDetail> {
  const client = getPublicApiClient(apiUrl);
  const result = await client.get<{
    edition: DigestEditionSummary;
    items: DigestEditionItem[];
  }>(`/api/v1/public/digest/topics/${slug}/editions/${editionId}`, {
    authMode: 'public',
    signal: options?.signal,
  });

  return { ...result.edition, items: result.items };
}

/**
 * Report a topic
 */
export async function reportTopic(
  apiUrl: string,
  slug: string,
  input: Omit<CreateReportInput, 'topicId'>
): Promise<{ reportId: string; message: string }> {
  const client = getPublicApiClient(apiUrl);
  return client.post<{ reportId: string; message: string }>(
    `/api/v1/public/digest/topics/${slug}/report`,
    {
      body: input,
      authMode: 'public',
    }
  );
}
