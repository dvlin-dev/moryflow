/**
 * [DEFINES]: PaginationMeta, ProblemDetails
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
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  requestId?: string;
  details?: unknown;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}
