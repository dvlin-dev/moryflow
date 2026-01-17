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
  InboxItemAction,
  InboxItemState,
  Run,
  RunQueryParams,
  Topic,
  CreateTopicInput,
  UpdateTopicInput,
  PublicTopic,
  FollowTopicInput,
  FollowTopicResponse,
  TriggerRunResponse,
  UserTopicsResponse,
  FeedbackSuggestionsResponse,
  ApplySuggestionsInput,
  ApplySuggestionsResponse,
  FeedbackStats,
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

export async function triggerManualRun(id: string): Promise<TriggerRunResponse> {
  return apiClient.post<TriggerRunResponse>(`${DIGEST_API.SUBSCRIPTIONS}/${id}/run`, {});
}

// ========== Inbox API ==========

export async function fetchInboxStats(): Promise<InboxStats> {
  return apiClient.get<InboxStats>(`${DIGEST_API.INBOX}/stats`);
}

function getInboxItemState(item: {
  readAt: string | null;
  savedAt: string | null;
  notInterestedAt: string | null;
}): InboxItemState {
  if (item.savedAt) return 'SAVED';
  if (item.notInterestedAt) return 'NOT_INTERESTED';
  if (item.readAt) return 'READ';
  return 'UNREAD';
}

export async function fetchInboxItems(
  params?: InboxQueryParams
): Promise<PaginatedResponse<InboxItem>> {
  const backendParams: Record<string, string | number | boolean | undefined> = {
    page: params?.page,
    limit: params?.limit,
    subscriptionId: params?.subscriptionId,
  };

  if (params?.state) {
    switch (params.state) {
      case 'UNREAD':
        backendParams.unread = true;
        backendParams.saved = false;
        backendParams.notInterested = false;
        break;
      case 'READ':
        backendParams.unread = false;
        backendParams.saved = false;
        backendParams.notInterested = false;
        break;
      case 'SAVED':
        backendParams.saved = true;
        break;
      case 'NOT_INTERESTED':
        backendParams.notInterested = true;
        break;
    }
  }

  const query = buildQueryString(backendParams);
  const url = query ? `${DIGEST_API.INBOX}?${query}` : DIGEST_API.INBOX;
  const result = await apiClient.get<PaginatedResponse<Omit<InboxItem, 'state'>>>(url);

  return {
    ...result,
    items: result.items.map((item) => ({
      ...item,
      state: getInboxItemState(item),
    })),
  };
}

export async function updateInboxItemState(id: string, action: InboxItemAction): Promise<void> {
  await apiClient.patch(`${DIGEST_API.INBOX}/${id}`, { action });
}

export async function markAllAsRead(subscriptionId?: string): Promise<{ markedCount: number }> {
  const url = subscriptionId
    ? `${DIGEST_API.INBOX}/mark-all-read?${buildQueryString({ subscriptionId })}`
    : `${DIGEST_API.INBOX}/mark-all-read`;

  return apiClient.post<{ markedCount: number }>(url, {});
}

export async function fetchInboxItemContent(itemId: string): Promise<{
  markdown: string | null;
  titleSnapshot?: string;
  urlSnapshot?: string;
}> {
  return apiClient.get<{
    markdown: string | null;
    titleSnapshot?: string;
    urlSnapshot?: string;
  }>(`${DIGEST_API.INBOX}/${itemId}/content`);
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

// ========== Topics API ==========

export async function fetchUserTopics(): Promise<UserTopicsResponse> {
  return apiClient.get<UserTopicsResponse>(DIGEST_API.TOPICS);
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

// ========== Feedback API ==========

export async function fetchFeedbackSuggestions(
  subscriptionId: string
): Promise<FeedbackSuggestionsResponse> {
  return apiClient.get<FeedbackSuggestionsResponse>(
    `${DIGEST_API.SUBSCRIPTIONS}/${subscriptionId}/feedback/suggestions`
  );
}

export async function applyFeedbackSuggestions(
  subscriptionId: string,
  data: ApplySuggestionsInput
): Promise<ApplySuggestionsResponse> {
  return apiClient.post<ApplySuggestionsResponse>(
    `${DIGEST_API.SUBSCRIPTIONS}/${subscriptionId}/feedback/apply`,
    data
  );
}

export async function fetchFeedbackStats(subscriptionId: string): Promise<FeedbackStats> {
  return apiClient.get<FeedbackStats>(
    `${DIGEST_API.SUBSCRIPTIONS}/${subscriptionId}/feedback/stats`
  );
}
