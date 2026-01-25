/**
 * 共享类型定义
 */

/** 分页信息 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

/** 订阅层级 */
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'TEAM';

/** 订阅状态 */
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'EXPIRED';
