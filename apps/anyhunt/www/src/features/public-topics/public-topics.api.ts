/**
 * [PROVIDES]: Public topics/editions API wrappers
 * [DEPENDS]: lib/digest-api
 * [POS]: SEO topics routes data access layer
 */

import {
  getEditionById,
  getPublicTopics,
  getTopicBySlug,
  getTopicEditions,
  type DigestEditionDetail,
  type DigestEditionSummary,
  type DigestTopicDetail,
  type DigestTopicSummary,
  type PaginatedResponse,
} from '@/lib/digest-api';

export type { DigestEditionDetail, DigestEditionSummary, DigestTopicDetail, DigestTopicSummary };

export async function fetchPublicTopicsPage(
  apiUrl: string,
  page: number,
  limit: number,
  signal?: AbortSignal
): Promise<PaginatedResponse<DigestTopicSummary>> {
  return getPublicTopics(apiUrl, { page, limit, signal });
}

export async function fetchTopicDetail(
  apiUrl: string,
  slug: string,
  signal?: AbortSignal
): Promise<DigestTopicDetail> {
  return getTopicBySlug(apiUrl, slug, { signal });
}

export async function fetchTopicEditionsPage(
  apiUrl: string,
  slug: string,
  page: number,
  limit: number,
  signal?: AbortSignal
): Promise<PaginatedResponse<DigestEditionSummary>> {
  return getTopicEditions(apiUrl, slug, { page, limit, signal });
}

export async function fetchEditionDetail(
  apiUrl: string,
  slug: string,
  editionId: string,
  signal?: AbortSignal
): Promise<DigestEditionDetail> {
  return getEditionById(apiUrl, slug, editionId, { signal });
}
