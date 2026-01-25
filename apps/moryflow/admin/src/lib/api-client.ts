/**
 * API 客户端
 * 使用 Bearer Token 认证，统一错误处理
 */
import { useAuthStore, getAccessToken } from '../stores/auth';
import { API_BASE_URL } from './api-base';

/**
 * API 错误类
 * 用于统一处理 API 请求错误
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;
  errors?: Array<{ field?: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    requestId?: string,
    errors?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.errors = errors;
  }

  /** 是否为认证错误 */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 是否为权限错误 */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** 是否为未找到错误 */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** 是否为服务器错误 */
  get isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * API 响应错误结构
 */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  requestId?: string;
  details?: unknown;
  errors?: Array<{ field?: string; message: string }>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 处理响应
   * 统一错误处理，401/403 自动登出
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const isJson =
      contentType.includes('application/json') || contentType.includes('application/problem+json');
    const payload = isJson ? await response.json().catch(() => ({})) : undefined;

    if (!response.ok) {
      const problem = payload as ProblemDetails;
      const message =
        typeof problem?.detail === 'string' ? problem.detail : `请求失败 (${response.status})`;
      const code = typeof problem?.code === 'string' ? problem.code : 'UNKNOWN_ERROR';
      const requestId = response.headers.get('x-request-id') ?? undefined;
      throw new ApiError(
        response.status,
        code,
        message,
        problem?.details,
        problem?.requestId ?? requestId,
        problem?.errors
      );
    }

    if (!isJson) {
      return {} as T;
    }

    return payload as T;
  }

  /**
   * 发送请求
   * 使用 Bearer Token 认证
   */
  private async request<T>(endpoint: string, options?: RequestInit, attempt = 0): Promise<T> {
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // 添加 Authorization header
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      const refreshed = await useAuthStore.getState().refreshAccessToken();
      if (refreshed && attempt === 0) {
        return this.request<T>(endpoint, options, attempt + 1);
      }
      await useAuthStore.getState().logout();
    }

    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
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

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * POST 请求返回 Blob（用于文件下载）
   */
  async postBlob(endpoint: string, data?: unknown, attempt = 0): Promise<Blob> {
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await useAuthStore.getState().refreshAccessToken();
        if (refreshed && attempt === 0) {
          return this.postBlob(endpoint, data, attempt + 1);
        }
        await useAuthStore.getState().logout();
      }
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', '下载失败');
    }

    return response.blob();
  }
}

// 单例实例
export const apiClient = new ApiClient(API_BASE_URL);
