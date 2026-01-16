/**
 * Subscriptions API
 */
import { apiClient } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import { buildUrl } from '@/lib/query-utils';
import type {
  PaginatedResponse,
  SubscriptionListItem,
  SubscriptionDetail,
  SubscriptionQuery,
  UpdateSubscriptionRequest,
} from './types';

/** 获取订阅列表 */
export async function getSubscriptions(
  query: SubscriptionQuery = {}
): Promise<PaginatedResponse<SubscriptionListItem>> {
  const url = buildUrl(ADMIN_API.SUBSCRIPTIONS, {
    page: query.page,
    limit: query.limit,
    search: query.search,
    tier: query.tier,
    status: query.status,
  });
  return apiClient.get<PaginatedResponse<SubscriptionListItem>>(url);
}

/** 获取单个订阅 */
export async function getSubscription(id: string): Promise<SubscriptionDetail> {
  return apiClient.get<SubscriptionDetail>(`${ADMIN_API.SUBSCRIPTIONS}/${id}`);
}

/** 更新订阅 */
export async function updateSubscription(
  id: string,
  data: UpdateSubscriptionRequest
): Promise<SubscriptionListItem> {
  return apiClient.patch<SubscriptionListItem>(`${ADMIN_API.SUBSCRIPTIONS}/${id}`, data);
}
