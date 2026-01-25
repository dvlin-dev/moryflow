/**
 * 订阅 API
 */
import { adminApi } from '@/lib/api';
import type { SubscriptionListResponse, Subscription } from '@/types/payment';

export interface SubscriptionsQueryParams {
  limit: number;
  offset: number;
  status?: string;
}

export const subscriptionsApi = {
  /** 获取订阅列表 */
  getAll: (params: SubscriptionsQueryParams): Promise<SubscriptionListResponse> => {
    const searchParams = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });
    if (params.status && params.status !== 'all') {
      searchParams.set('status', params.status);
    }
    return adminApi.get(`/payment/subscriptions?${searchParams}`);
  },

  /** 获取订阅详情 */
  getById: (id: string): Promise<{ subscription: Subscription }> =>
    adminApi.get(`/payment/subscriptions/${id}`),

  /** 取消订阅 */
  cancel: (id: string, cancelAtPeriodEnd = true): Promise<void> =>
    adminApi.post(`/payment/subscriptions/${id}/cancel`, { cancelAtPeriodEnd }),
};
