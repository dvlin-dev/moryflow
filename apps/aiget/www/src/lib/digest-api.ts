/**
 * Digest Public API Client
 *
 * [PROVIDES]: Public topic/edition API calls for aiget.dev
 * [POS]: API client for public digest pages (no auth required)
 */

import { ApiError } from './api';

// ============== Types ==============

export interface DigestTopicSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  subscriberCount: number;
  lastEditionAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
  };
}

export interface DigestTopicDetail extends DigestTopicSummary {
  interests: string[];
  sources: string[];
  defaultCron: string;
  defaultTimezone: string;
}

export interface DigestEditionSummary {
  id: string;
  topicId: string;
  editionNumber: number;
  publishedAt: string;
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

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

// ============== API Response Types ==============

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============== Helper ==============

function handleApiResponse<T>(response: Response, json: ApiResponse<T>): T {
  if (!response.ok || !json.success) {
    const errorJson = json as ApiErrorResponse;
    throw new ApiError(
      errorJson.error?.message || `Request failed (${response.status})`,
      errorJson.error?.code
    );
  }
  return json.data;
}

// ============== API Functions ==============

/**
 * Get public topics list
 */
export async function getPublicTopics(
  apiUrl: string,
  options?: {
    cursor?: string;
    limit?: number;
    search?: string;
  }
): Promise<PaginatedResponse<DigestTopicSummary>> {
  const params = new URLSearchParams();
  if (options?.cursor) params.set('cursor', options.cursor);
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.search) params.set('search', options.search);

  const response = await fetch(`${apiUrl}/api/v1/public/digest/topics?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = (await response.json()) as ApiResponse<PaginatedResponse<DigestTopicSummary>>;
  return handleApiResponse(response, json);
}

/**
 * Get single topic by slug
 */
export async function getTopicBySlug(apiUrl: string, slug: string): Promise<DigestTopicDetail> {
  const response = await fetch(`${apiUrl}/api/v1/public/digest/topics/${slug}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = (await response.json()) as ApiResponse<DigestTopicDetail>;
  return handleApiResponse(response, json);
}

/**
 * Get topic editions list
 */
export async function getTopicEditions(
  apiUrl: string,
  slug: string,
  options?: {
    cursor?: string;
    limit?: number;
  }
): Promise<PaginatedResponse<DigestEditionSummary>> {
  const params = new URLSearchParams();
  if (options?.cursor) params.set('cursor', options.cursor);
  if (options?.limit) params.set('limit', options.limit.toString());

  const response = await fetch(
    `${apiUrl}/api/v1/public/digest/topics/${slug}/editions?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const json = (await response.json()) as ApiResponse<PaginatedResponse<DigestEditionSummary>>;
  return handleApiResponse(response, json);
}

/**
 * Get single edition by ID
 */
export async function getEditionById(
  apiUrl: string,
  slug: string,
  editionId: string
): Promise<DigestEditionDetail> {
  const response = await fetch(
    `${apiUrl}/api/v1/public/digest/topics/${slug}/editions/${editionId}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const json = (await response.json()) as ApiResponse<DigestEditionDetail>;
  return handleApiResponse(response, json);
}
