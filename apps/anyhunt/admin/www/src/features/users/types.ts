/**
 * Users 类型定义
 */
import type {
  ApiResponse,
  Pagination,
  PaginatedResponse,
  SubscriptionTier,
  SubscriptionStatus,
} from '@/lib/types';

export type { ApiResponse, Pagination, PaginatedResponse, SubscriptionTier, SubscriptionStatus };

/** 用户配额信息 */
export interface UserQuota {
  monthlyLimit: number;
  monthlyUsed: number;
  purchasedQuota: number;
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
  screenshotCount: number;
  apiKeyCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 用户详情 */
export interface UserDetail extends UserListItem {
  image: string | null;
  webhookCount: number;
  deletedAt: string | null;
}

/** 用户查询参数 */
export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
  isAdmin?: boolean;
}

/** 更新用户请求 */
export interface UpdateUserRequest {
  name?: string;
  isAdmin?: boolean;
}

/** 手动充值 Credits 请求 */
export interface GrantCreditsRequest {
  amount: number;
  reason: string;
}

/** 手动充值 Credits 结果 */
export interface GrantCreditsResult {
  userId: string;
  amount: number;
  purchasedQuotaBefore: number;
  purchasedQuotaAfter: number;
  quotaTransactionId: string;
  auditLogId: string;
}

/** Credits 充值记录（仅 ADMIN_GRANT） */
export interface CreditGrantRecord {
  id: string;
  createdAt: string;
  actorUserId: string | null;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string | null;
}

export interface CreditGrantsQuery {
  limit?: number;
}
