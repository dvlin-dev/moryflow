/**
 * [PROVIDES]: apiClient, ApiError, API_BASE_URL, PaginatedResult
 * [DEPENDS]: @memai/shared-types, stores/auth
 * [POS]: Centralized API client with Bearer token auth, error handling, response unwrapping
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/admin/CLAUDE.md
 */
import { useAuthStore, getAuthToken } from '@/stores/auth';
import type { ApiErrorResponse as ApiErrorResponseType } from '@memai/shared-types';

// 开发环境使用空字符串走 Vite 代理，生产环境使用完整 URL
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * API 错误类
 */
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

/** 分页结果 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 处理响应 - 自动解包 data 字段
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // 处理 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // 处理非 JSON 响应
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(response.status, 'NETWORK_ERROR', 'Request failed');
      }
      return {} as T;
    }

    const json = await response.json();

    // 处理错误响应
    if (!response.ok || json.success === false) {
      // 401/403 自动登出
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().logout();
      }

      const errorResponse = json as ApiErrorResponseType;
      throw new ApiError(
        response.status,
        errorResponse.error?.code || 'UNKNOWN_ERROR',
        errorResponse.error?.message || `请求失败 (${response.status})`
      );
    }

    // 成功响应 - 返回 data 字段
    return json.data;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  /**
   * GET 分页请求 - 返回 items + pagination
   */
  async getPaginated<T>(endpoint: string): Promise<PaginatedResult<T>> {
    return this.request<PaginatedResult<T>>(endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
