/**
 * 共享类型定义
 * 用于跨模块共享的通用类型
 */

import type { SubscriptionTier } from './tier.types';

/**
 * 认证请求接口
 */
export interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    tier: SubscriptionTier;
  };
}

/**
 * 分页参数
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * 分页响应元数据
 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * 分页响应包装
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
