/**
 * Subscriptions API
 */
import { apiClient, type PaginatedResult } from '@/lib/api-client';
import { ADMIN_API } from '@/lib/api-paths';
import type {
  SubscriptionListItem,
  SubscriptionDetail,
  SubscriptionQuery,
  UpdateSubscriptionRequest,
} from './types';

/** 构建查询字符串 */
function buildQueryString(query: SubscriptionQuery): string {
  const params = new URLSearchParams();
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.tier) params.set('tier', query.tier);
  if (query.status) params.set('status', query.status);
  return params.toString();
}

/** 获取订阅列表 */
export async function getSubscriptions(
  query: SubscriptionQuery = {},
): Promise<PaginatedResult<SubscriptionListItem>> {
  const qs = buildQueryString(query);
  const url = qs ? `${ADMIN_API.SUBSCRIPTIONS}?${qs}` : ADMIN_API.SUBSCRIPTIONS;
  return apiClient.getPaginated<SubscriptionListItem>(url);
}

/** 获取单个订阅 */
export async function getSubscription(id: string): Promise<SubscriptionDetail> {
  return apiClient.get<SubscriptionDetail>(`${ADMIN_API.SUBSCRIPTIONS}/${id}`);
}

/** 更新订阅 */
export async function updateSubscription(
  id: string,
  data: UpdateSubscriptionRequest,
): Promise<SubscriptionListItem> {
  return apiClient.patch<SubscriptionListItem>(
    `${ADMIN_API.SUBSCRIPTIONS}/${id}`,
    data,
  );
}
