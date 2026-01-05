// ============ 统一 API 响应格式 ============

/** 分页元数据 */
export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** 成功响应 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

/** 分页成功响应 */
export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
  timestamp: string;
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

/** 通用响应（联合类型） */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============ 配额状态 ============

export interface QuotaStatus {
  monthly: {
    limit: number;
    used: number;
    remaining: number;
  };
  purchased: number;
  periodEndsAt: string;
}

// ============ API Key ============

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;  // 完整 key，仅创建时返回一次
  keyPrefix: string;
}
