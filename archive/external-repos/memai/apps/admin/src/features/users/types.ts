/**
 * Users 类型定义
 */
export type { PaginatedResponse } from '@/lib/types';
import type {
  SubscriptionTier,
  SubscriptionStatus,
} from '@/lib/subscription.types';

// Re-export for consumers
export type { SubscriptionTier, SubscriptionStatus };

/** 用户配额信息 */
export interface UserQuota {
  monthlyLimit: number;
  monthlyUsed: number;
}

/** 用户列表项 */
export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
  tier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus | null;
  quota: UserQuota | null;
  /** Memory 数量 */
  memoryCount: number;
  apiKeyCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 用户详情 */
export interface UserDetail extends UserListItem {
  image: string | null;
  webhookCount: number;
  deletedAt: string | null;
  /** 配额周期结束时间 */
  quotaPeriodEndAt?: string;
}

/** 用户查询参数 */
export interface UserQuery {
  offset?: number;
  limit?: number;
  search?: string;
  isAdmin?: boolean;
}

/** 更新用户请求 */
export interface UpdateUserRequest {
  name?: string;
  isAdmin?: boolean;
}
