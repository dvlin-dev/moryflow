/**
 * Digest Topics API
 *
 * [PROVIDES]: API calls for topic management
 * [POS]: Admin topic API functions
 */

import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  Topic,
  TopicQuery,
  TopicListResponse,
  SetFeaturedInput,
  ReorderFeaturedInput,
} from './types';

export async function fetchTopics(params?: TopicQuery): Promise<TopicListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.featured !== undefined) searchParams.set('featured', String(params.featured));
  if (params?.visibility) searchParams.set('visibility', params.visibility);
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const url = query ? `${ADMIN_API.DIGEST_TOPICS}?${query}` : ADMIN_API.DIGEST_TOPICS;

  return apiClient.get<TopicListResponse>(url);
}

export async function fetchFeaturedTopics(): Promise<Topic[]> {
  return apiClient.get<Topic[]>(`${ADMIN_API.DIGEST_TOPICS}/featured`);
}

export async function fetchTopic(id: string): Promise<Topic> {
  return apiClient.get<Topic>(`${ADMIN_API.DIGEST_TOPICS}/${id}`);
}

export async function setFeatured(id: string, input: SetFeaturedInput): Promise<Topic> {
  return apiClient.patch<Topic>(`${ADMIN_API.DIGEST_TOPICS}/${id}/featured`, input);
}

export async function reorderFeatured(input: ReorderFeaturedInput): Promise<Topic[]> {
  return apiClient.post<Topic[]>(`${ADMIN_API.DIGEST_TOPICS}/featured/reorder`, input);
}
