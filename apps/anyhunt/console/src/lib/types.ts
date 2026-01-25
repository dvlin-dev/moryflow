/**
 * 共享类型定义
 * [DEFINES]: Common shared types used across the console frontend
 * [USED_BY]: All feature modules (api-keys, webhooks, screenshots, etc.)
 * [POS]: Core type definitions for API responses and pagination
 */

/** 分页参数 */
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
