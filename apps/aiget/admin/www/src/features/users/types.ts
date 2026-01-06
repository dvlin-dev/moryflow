/**
 * Users 类型定义
 */
export type {
  ApiResponse,
  Pagination,
  PaginatedResponse,
  SubscriptionTier,
  SubscriptionStatus,
} from '@/lib/types';

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
