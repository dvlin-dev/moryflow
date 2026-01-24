/**
 * [DEFINES]: PaginationMeta, ApiErrorResponse
 * [USED_BY]: Anyhunt Console/Admin API 客户端
 * [POS]: 统一的响应元数据与错误结构
 */

/** 分页元数据 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** 错误响应 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
