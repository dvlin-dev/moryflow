/**
 * 共享类型定义
 */

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
