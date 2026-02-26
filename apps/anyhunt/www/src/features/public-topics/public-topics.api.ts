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
  limit: number
): Promise<PaginatedResponse<DigestTopicSummary>> {
  return getPublicTopics(apiUrl, { page, limit });
}

export async function fetchTopicDetail(apiUrl: string, slug: string): Promise<DigestTopicDetail> {
  return getTopicBySlug(apiUrl, slug);
}

export async function fetchTopicEditionsPage(
  apiUrl: string,
  slug: string,
  page: number,
  limit: number
): Promise<PaginatedResponse<DigestEditionSummary>> {
  return getTopicEditions(apiUrl, slug, { page, limit });
}

export async function fetchEditionDetail(
  apiUrl: string,
  slug: string,
  editionId: string
): Promise<DigestEditionDetail> {
  return getEditionById(apiUrl, slug, editionId);
}
