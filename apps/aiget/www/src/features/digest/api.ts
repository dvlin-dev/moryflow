/**
 * [PROVIDES]: Digest API functions
 * [POS]: API calls for subscriptions, inbox, runs, topics (Session auth)
 */

import { apiClient } from '@/lib/api-client';
import { DIGEST_API, DIGEST_PUBLIC_API } from '@/lib/api-paths';
import type {
  Subscription,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  SubscriptionQueryParams,
  PaginatedResponse,
  InboxItem,
  InboxStats,
  InboxQueryParams,
  InboxItemState,
  Run,
  RunItem,
  RunQueryParams,
  Topic,
  CreateTopicInput,
  UpdateTopicInput,
  PublicTopic,
  FollowTopicInput,
  FollowTopicResponse,
} from './types';

// ========== Subscription API ==========

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

export async function fetchSubscriptions(
  params?: SubscriptionQueryParams
): Promise<PaginatedResponse<Subscription>> {
  const query = params
    ? buildQueryString(params as Record<string, string | number | boolean | undefined>)
    : '';
  const url = query ? `${DIGEST_API.SUBSCRIPTIONS}?${query}` : DIGEST_API.SUBSCRIPTIONS;
  return apiClient.get<PaginatedResponse<Subscription>>(url);
}

export async function fetchSubscription(id: string): Promise<Subscription> {
  return apiClient.get<Subscription>(`${DIGEST_API.SUBSCRIPTIONS}/${id}`);
}

export async function createSubscription(data: CreateSubscriptionInput): Promise<Subscription> {
  return apiClient.post<Subscription>(DIGEST_API.SUBSCRIPTIONS, data);
}

export async function updateSubscription(
  id: string,
  data: UpdateSubscriptionInput
): Promise<Subscription> {
  return apiClient.patch<Subscription>(`${DIGEST_API.SUBSCRIPTIONS}/${id}`, data);
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiClient.delete(`${DIGEST_API.SUBSCRIPTIONS}/${id}`);
}

export async function toggleSubscription(id: string): Promise<Subscription> {
  return apiClient.post<Subscription>(`${DIGEST_API.SUBSCRIPTIONS}/${id}/toggle`, {});
}

export async function triggerManualRun(id: string): Promise<Run> {
  return apiClient.post<Run>(`${DIGEST_API.SUBSCRIPTIONS}/${id}/run`, {});
}

// ========== Inbox API ==========

export async function fetchInboxItems(
  params?: InboxQueryParams
): Promise<PaginatedResponse<InboxItem>> {
  const query = params
    ? buildQueryString(params as Record<string, string | number | boolean | undefined>)
    : '';
  const url = query ? `${DIGEST_API.INBOX}?${query}` : DIGEST_API.INBOX;
  return apiClient.get<PaginatedResponse<InboxItem>>(url);
}

export async function fetchInboxStats(): Promise<InboxStats> {
  return apiClient.get<InboxStats>(`${DIGEST_API.INBOX}/stats`);
}

export async function updateInboxItemState(id: string, state: InboxItemState): Promise<InboxItem> {
  return apiClient.patch<InboxItem>(`${DIGEST_API.INBOX}/${id}`, { state });
}

export async function markAllAsRead(subscriptionId?: string): Promise<{ count: number }> {
  const data: Record<string, string> = {};
  if (subscriptionId) data.subscriptionId = subscriptionId;
  return apiClient.post<{ count: number }>(`${DIGEST_API.INBOX}/mark-all-read`, data);
}

// ========== Runs API ==========

export async function fetchRuns(
  subscriptionId: string,
  params?: RunQueryParams
): Promise<PaginatedResponse<Run>> {
  const query = params
    ? buildQueryString(params as Record<string, string | number | boolean | undefined>)
    : '';
  const base = `${DIGEST_API.SUBSCRIPTIONS}/${subscriptionId}/runs`;
  const url = query ? `${base}?${query}` : base;
  return apiClient.get<PaginatedResponse<Run>>(url);
}

export async function fetchRun(subscriptionId: string, runId: string): Promise<Run> {
  return apiClient.get<Run>(`${DIGEST_API.SUBSCRIPTIONS}/${subscriptionId}/runs/${runId}`);
}

export async function fetchRunItems(subscriptionId: string, runId: string): Promise<RunItem[]> {
  return apiClient.get<RunItem[]>(
    `${DIGEST_API.SUBSCRIPTIONS}/${subscriptionId}/runs/${runId}/items`
  );
}

// ========== Topics API ==========

export async function fetchUserTopics(params?: {
  cursor?: string;
  limit?: number;
}): Promise<PaginatedResponse<Topic>> {
  const query = params ? buildQueryString(params) : '';
  const url = query ? `${DIGEST_API.TOPICS}?${query}` : DIGEST_API.TOPICS;
  return apiClient.get<PaginatedResponse<Topic>>(url);
}

export async function createTopic(data: CreateTopicInput): Promise<Topic> {
  return apiClient.post<Topic>(DIGEST_API.TOPICS, data);
}

export async function updateTopic(id: string, data: UpdateTopicInput): Promise<Topic> {
  return apiClient.patch<Topic>(`${DIGEST_API.TOPICS}/${id}`, data);
}

export async function deleteTopic(id: string): Promise<void> {
  await apiClient.delete(`${DIGEST_API.TOPICS}/${id}`);
}

// ========== Public Topics API (for Follow) ==========

export async function fetchPublicTopicBySlug(slug: string): Promise<PublicTopic> {
  return apiClient.get<PublicTopic>(`${DIGEST_PUBLIC_API.TOPICS}/${slug}`);
}

export async function followTopic(
  slug: string,
  data: FollowTopicInput
): Promise<FollowTopicResponse> {
  return apiClient.post<FollowTopicResponse>(`${DIGEST_PUBLIC_API.TOPICS}/${slug}/follow`, data);
}
