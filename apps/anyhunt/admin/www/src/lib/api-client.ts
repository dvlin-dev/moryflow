/**
 * [PROVIDES]: apiClient, ApiError
 * [DEPENDS]: fetch, import.meta.env, zustand store
 * [POS]: Admin API 请求封装（Access Token + Refresh）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { useAuthStore, getAccessToken } from '@/stores/auth';
import type { PaginationMeta, ApiErrorResponse } from '@anyhunt/types';
import { API_BASE_URL } from './api-base';

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
   * 构建请求头（Access Token 优先）
   */
  private buildHeaders(additionalHeaders?: HeadersInit, token?: string | null): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(additionalHeaders as Record<string, string>),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
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
      errorResponse.error?.message || `Request failed (${status})`,
      errorResponse.error?.details
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
      this.throwApiError(response.status, json);
    }

    // 成功响应 - 自动解包 data 字段
    return (json as { data: T }).data;
  }

  /**
   * 发送请求（Access Token + Refresh）
   */
  private async fetchWithAuth(
    endpoint: string,
    options?: RequestInit,
    attempt = 0
  ): Promise<Response> {
    const token = getAccessToken();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: this.buildHeaders(options?.headers, token),
      credentials: 'include',
    });

    if (response.status === 401) {
      const refreshed = await useAuthStore.getState().refreshAccessToken();
      if (refreshed && attempt === 0) {
        return this.fetchWithAuth(endpoint, options, attempt + 1);
      }
      await useAuthStore.getState().logout();
    }

    return response;
  }

  private async request<T>(endpoint: string, options?: RequestInit, attempt = 0): Promise<T> {
    const response = await this.fetchWithAuth(endpoint, options, attempt);
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
   * GET 分页请求 - 返回 data + meta
   */
  async getPaginated<T>(endpoint: string): Promise<PaginatedResult<T>> {
    const response = await this.fetchWithAuth(endpoint);

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
   * GET Blob 请求（用于文件下载）
   */
  async getBlob(endpoint: string): Promise<Blob> {
    const response = await this.fetchWithAuth(endpoint);

    if (!response.ok) {
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed');
    }

    return response.blob();
  }

  /**
   * POST Blob 请求（用于导出等需要 POST 请求的文件下载）
   */
  async postBlob(endpoint: string, data?: unknown): Promise<Blob> {
    const response = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed');
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
