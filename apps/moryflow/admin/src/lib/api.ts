/**
 * Admin API Client
 * 便捷的 API 请求封装
 */
import { apiClient } from './api-client';
import { ADMIN_API } from './api-paths';
import type { ApiClientRequestOptions } from '@anyhunt/api/client';

type ApiBody = ApiClientRequestOptions['body'];

/**
 * Admin API 客户端实例
 * 所有请求自动添加 /api/v1/admin 前缀
 */
export const adminApi = {
  /** GET 请求 */
  get: <T>(endpoint: string): Promise<T> => {
    return apiClient.get<T>(`${ADMIN_API.BASE}${endpoint}`);
  },

  /** POST 请求 */
  post: <T>(endpoint: string, data?: ApiBody): Promise<T> => {
    return apiClient.post<T>(`${ADMIN_API.BASE}${endpoint}`, data);
  },

  /** PATCH 请求 */
  patch: <T>(endpoint: string, data?: ApiBody): Promise<T> => {
    return apiClient.patch<T>(`${ADMIN_API.BASE}${endpoint}`, data);
  },

  /** PUT 请求 */
  put: <T>(endpoint: string, data?: ApiBody): Promise<T> => {
    return apiClient.put<T>(`${ADMIN_API.BASE}${endpoint}`, data);
  },

  /** DELETE 请求 */
  delete: <T>(endpoint: string): Promise<T> => {
    return apiClient.delete<T>(`${ADMIN_API.BASE}${endpoint}`);
  },
};
