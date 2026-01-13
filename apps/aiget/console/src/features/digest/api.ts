/**
 * Digest API Functions
 *
 * [PROVIDES]: API calls for digest subscriptions, inbox, runs
 * [POS]: Console API functions (Session authenticated)
 */

import { apiClient } from '@/lib/api-client';
import { DIGEST_CONSOLE_API, DIGEST_PUBLIC_API } from '@/lib/api-paths';
import type {
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
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
  CreateTopicRequest,
  UpdateTopicRequest,
  PublicTopic,
  FollowTopicRequest,
  FollowTopicResponse,
} from './types';

// ========== Subscription API ==========

export async function fetchSubscriptions(
  params?: SubscriptionQueryParams
): Promise<PaginatedResponse<Subscription>> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.enabled !== undefined) searchParams.set('enabled', String(params.enabled));

  const query = searchParams.toString();
  const url = query
    ? `${DIGEST_CONSOLE_API.SUBSCRIPTIONS}?${query}`
    : DIGEST_CONSOLE_API.SUBSCRIPTIONS;

  return apiClient.get<PaginatedResponse<Subscription>>(url);
}

export async function fetchSubscription(id: string): Promise<Subscription> {
  return apiClient.get<Subscription>(`${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${id}`);
}

export async function createSubscription(data: CreateSubscriptionRequest): Promise<Subscription> {
  return apiClient.post<Subscription>(DIGEST_CONSOLE_API.SUBSCRIPTIONS, data);
}

export async function updateSubscription(
  id: string,
  data: UpdateSubscriptionRequest
): Promise<Subscription> {
  return apiClient.patch<Subscription>(`${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${id}`, data);
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiClient.delete(`${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${id}`);
}

export async function toggleSubscription(id: string): Promise<Subscription> {
  return apiClient.post<Subscription>(`${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${id}/toggle`, {});
}

export async function triggerManualRun(id: string): Promise<Run> {
  return apiClient.post<Run>(`${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${id}/run`, {});
}

// ========== Inbox API ==========

export async function fetchInboxItems(
  params?: InboxQueryParams
): Promise<PaginatedResponse<InboxItem>> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.subscriptionId) searchParams.set('subscriptionId', params.subscriptionId);
  if (params?.state) searchParams.set('state', params.state);

  const query = searchParams.toString();
  const url = query ? `${DIGEST_CONSOLE_API.INBOX}?${query}` : DIGEST_CONSOLE_API.INBOX;

  return apiClient.get<PaginatedResponse<InboxItem>>(url);
}

export async function fetchInboxStats(): Promise<InboxStats> {
  return apiClient.get<InboxStats>(`${DIGEST_CONSOLE_API.INBOX}/stats`);
}

export async function updateInboxItemState(id: string, state: InboxItemState): Promise<InboxItem> {
  return apiClient.patch<InboxItem>(`${DIGEST_CONSOLE_API.INBOX}/${id}`, { state });
}

export async function markAllAsRead(subscriptionId?: string): Promise<{ count: number }> {
  const data: Record<string, string> = {};
  if (subscriptionId) data.subscriptionId = subscriptionId;
  return apiClient.post<{ count: number }>(`${DIGEST_CONSOLE_API.INBOX}/mark-all-read`, data);
}

// ========== Runs API ==========

export async function fetchRuns(
  subscriptionId: string,
  params?: RunQueryParams
): Promise<PaginatedResponse<Run>> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const url = query
    ? `${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${subscriptionId}/runs?${query}`
    : `${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${subscriptionId}/runs`;

  return apiClient.get<PaginatedResponse<Run>>(url);
}

export async function fetchRun(subscriptionId: string, runId: string): Promise<Run> {
  return apiClient.get<Run>(`${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${subscriptionId}/runs/${runId}`);
}

export async function fetchRunItems(subscriptionId: string, runId: string): Promise<RunItem[]> {
  return apiClient.get<RunItem[]>(
    `${DIGEST_CONSOLE_API.SUBSCRIPTIONS}/${subscriptionId}/runs/${runId}/items`
  );
}

// ========== Topics API ==========

export async function fetchUserTopics(params?: {
  cursor?: string;
  limit?: number;
}): Promise<PaginatedResponse<Topic>> {
  const searchParams = new URLSearchParams();
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();
  const url = query ? `${DIGEST_CONSOLE_API.TOPICS}?${query}` : DIGEST_CONSOLE_API.TOPICS;

  return apiClient.get<PaginatedResponse<Topic>>(url);
}

export async function createTopic(data: CreateTopicRequest): Promise<Topic> {
  return apiClient.post<Topic>(DIGEST_CONSOLE_API.TOPICS, data);
}

export async function updateTopic(id: string, data: UpdateTopicRequest): Promise<Topic> {
  return apiClient.patch<Topic>(`${DIGEST_CONSOLE_API.TOPICS}/${id}`, data);
}

export async function deleteTopic(id: string): Promise<void> {
  await apiClient.delete(`${DIGEST_CONSOLE_API.TOPICS}/${id}`);
}

// ========== Public Topics API (for Follow) ==========

export async function fetchPublicTopicBySlug(slug: string): Promise<PublicTopic> {
  return apiClient.get<PublicTopic>(`${DIGEST_PUBLIC_API.TOPICS}/${slug}`);
}

export async function followTopic(
  slug: string,
  data: FollowTopicRequest
): Promise<FollowTopicResponse> {
  return apiClient.post<FollowTopicResponse>(`${DIGEST_PUBLIC_API.TOPICS}/${slug}/follow`, data);
}
