/**
 * Digest Public API Client
 *
 * [PROVIDES]: Public topic/edition API calls for anyhunt.app
 * [POS]: API client for public digest pages (no auth required)
 */

import { parseJsonResponse } from './api';

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
  }
): Promise<PaginatedResponse<DigestTopicSummary>> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.search) params.set('q', options.search);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.featured !== undefined) params.set('featured', options.featured.toString());

  const response = await fetch(`${apiUrl}/api/v1/digest/topics?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return parseJsonResponse<PaginatedResponse<DigestTopicSummary>>(response);
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
export async function getTopicBySlug(apiUrl: string, slug: string): Promise<DigestTopicDetail> {
  const response = await fetch(`${apiUrl}/api/v1/digest/topics/${slug}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return parseJsonResponse<DigestTopicDetail>(response);
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
  }
): Promise<PaginatedResponse<DigestEditionSummary>> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());

  const response = await fetch(
    `${apiUrl}/api/v1/digest/topics/${slug}/editions?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  return parseJsonResponse<PaginatedResponse<DigestEditionSummary>>(response);
}

/**
 * Get single edition by ID
 */
export async function getEditionById(
  apiUrl: string,
  slug: string,
  editionId: string
): Promise<DigestEditionDetail> {
  const response = await fetch(`${apiUrl}/api/v1/digest/topics/${slug}/editions/${editionId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const result = await parseJsonResponse<{
    edition: DigestEditionSummary;
    items: DigestEditionItem[];
  }>(response);
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
  const response = await fetch(`${apiUrl}/api/v1/digest/topics/${slug}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ reportId: string; message: string }>(response);
}
