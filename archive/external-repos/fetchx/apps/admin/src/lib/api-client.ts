/**
 * API 客户端
 * 自动解包响应数据，统一错误处理
 */
import { useAuthStore, getAuthToken } from '@/stores/auth';
import type { PaginationMeta, ApiErrorResponse } from '@aiget/shared-types';

// 开发环境使用空字符串走 Vite 代理，生产环境使用完整 URL
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * API 错误类
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
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
  data: T[];
  meta: PaginationMeta;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 构建请求头
   */
  private buildHeaders(additionalHeaders?: HeadersInit): HeadersInit {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(additionalHeaders as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 处理认证错误
   */
  private handleAuthError(status: number): void {
    if (status === 401 || status === 403) {
      useAuthStore.getState().logout();
    }
  }

  /**
   * 安全解析 JSON
   */
  private async safeParseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  /**
   * 处理错误响应
   */
  private throwApiError(status: number, json: unknown): never {
    const errorResponse = json as ApiErrorResponse;
    throw new ApiError(
      status,
      errorResponse.error?.code || 'UNKNOWN_ERROR',
      errorResponse.error?.message || `请求失败 (${status})`,
      errorResponse.error?.details,
    );
  }

  /**
   * 处理响应 - 自动解包 data 字段
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // 非 JSON 响应
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiError(response.status, 'NETWORK_ERROR', 'Request failed');
      }
      return {} as T;
    }

    const json = await this.safeParseJson(response);

    // 处理错误响应
    if (!response.ok || (json as { success?: boolean }).success === false) {
      this.handleAuthError(response.status);
      this.throwApiError(response.status, json);
    }

    // 成功响应 - 自动解包 data 字段
    return (json as { data: T }).data;
  }

  /**
   * 发送请求
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: this.buildHeaders(options?.headers),
    });

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

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * GET 分页请求 - 返回 data + meta
   */
  async getPaginated<T>(endpoint: string): Promise<PaginatedResult<T>> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: this.buildHeaders(),
    });

    this.handleAuthError(response.status);

    const json = await this.safeParseJson(response);

    if (!response.ok || (json as { success?: boolean }).success === false) {
      this.throwApiError(response.status, json);
    }

    const typedJson = json as { data: T[]; meta: PaginationMeta };
    return {
      data: typedJson.data,
      meta: typedJson.meta,
    };
  }

  /**
   * 构建 Blob 请求头（不含 Content-Type，除非是 POST）
   */
  private buildBlobHeaders(includeContentType = false): Record<string, string> {
    const token = getAuthToken();
    const headers: Record<string, string> = {};

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * 发送 Blob 请求
   */
  private async requestBlob(
    endpoint: string,
    options?: RequestInit,
  ): Promise<Blob> {
    const response = await fetch(`${this.baseURL}${endpoint}`, options);

    if (!response.ok) {
      this.handleAuthError(response.status);
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed');
    }

    return response.blob();
  }

  /**
   * GET Blob 请求（用于文件下载）
   */
  async getBlob(endpoint: string): Promise<Blob> {
    return this.requestBlob(endpoint, {
      headers: this.buildBlobHeaders(),
    });
  }

  /**
   * POST Blob 请求（用于导出等需要 POST 请求的文件下载）
   */
  async postBlob(endpoint: string, data?: unknown): Promise<Blob> {
    return this.requestBlob(endpoint, {
      method: 'POST',
      headers: this.buildBlobHeaders(true),
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
