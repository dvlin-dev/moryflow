/**
 * [PROVIDES]: apiClient, ApiError
 * [DEPENDS]: fetch, import.meta.env, zustand store
 * [POS]: Console API 请求封装（Access Token + Refresh）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { useAuthStore, getAccessToken } from '../stores/auth';
import type { ProblemDetails } from '@anyhunt/types';
import { API_BASE_URL } from './api-base';

/**
 * API 错误类
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
  private async safeParseJson(response: Response): Promise<{
    parsed: boolean;
    value: unknown;
  }> {
    try {
      return { parsed: true, value: await response.json() };
    } catch {
      return { parsed: false, value: undefined };
    }
  }

  /**
   * 处理错误响应
   */
  private throwApiError(status: number, json: unknown, requestId?: string): never {
    const problem = json as ProblemDetails;
    const message =
      typeof problem?.detail === 'string' ? problem.detail : `Request failed (${status})`;
    const code = typeof problem?.code === 'string' ? problem.code : 'UNKNOWN_ERROR';
    throw new ApiError(
      status,
      code,
      message,
      problem?.details,
      problem?.requestId ?? requestId,
      problem?.errors
    );
  }

  /**
   * 处理响应
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    const isJson =
      contentType.includes('application/json') || contentType.includes('application/problem+json');
    const requestId = response.headers.get('x-request-id') ?? undefined;
    const parsed = isJson ? await this.safeParseJson(response) : undefined;

    if (!response.ok) {
      this.throwApiError(response.status, parsed?.value, requestId);
    }

    if (!isJson || !parsed?.parsed) {
      throw new ApiError(
        response.status,
        'UNEXPECTED_RESPONSE',
        'Unexpected response format',
        undefined,
        requestId
      );
    }

    return parsed.value as T;
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
   * Blob 请求（用于文件下载）
   */
  async getBlob(endpoint: string): Promise<Blob> {
    const response = await this.fetchWithAuth(endpoint);

    if (!response.ok) {
      const parsed = await this.safeParseJson(response);
      const requestId = response.headers.get('x-request-id') ?? undefined;
      this.throwApiError(response.status, parsed.value, requestId || undefined);
    }

    return response.blob();
  }

  /**
   * POST 请求返回 Blob（用于文件下载）
   */
  async postBlob(endpoint: string, data?: unknown): Promise<Blob> {
    const response = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const parsed = await this.safeParseJson(response);
      const requestId = response.headers.get('x-request-id') ?? undefined;
      this.throwApiError(response.status, parsed.value, requestId || undefined);
    }

    return response.blob();
  }
}

// 单例实例
export const apiClient = new ApiClient(API_BASE_URL);
