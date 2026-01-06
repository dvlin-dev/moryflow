/**
 * Subscriptions 类型定义
 */
export type { PaginatedResponse } from '@/lib/types';
import type {
  SubscriptionTier,
  SubscriptionStatus,
} from '@/lib/subscription.types';

// Re-export for consumers
export type { SubscriptionTier, SubscriptionStatus };

/** 订阅列表项 */
export interface SubscriptionListItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  /** 当前周期开始时间 */
  periodStartAt: string;
  /** 当前周期结束时间 */
  periodEndAt: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 订阅详情 */
export interface SubscriptionDetail extends SubscriptionListItem {
  creemCustomerId: string | null;
  creemSubscriptionId: string | null;
}

/** 订阅查询参数 */
export interface SubscriptionQuery {
  offset?: number;
  limit?: number;
  search?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
}

/** 更新订阅请求 */
export interface UpdateSubscriptionRequest {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
}
