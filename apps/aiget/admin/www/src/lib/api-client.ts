/**
 * [PROVIDES]: apiClient, ApiError
 * [DEPENDS]: fetch, import.meta.env, zustand store, @aiget/auth-client
 * [POS]: Admin API 请求封装（含 refresh 重试）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { authClient } from './auth-client';
import { toAuthUser } from './auth-utils';
import { useAuthStore, getAccessToken } from '@/stores/auth';
import type { PaginationMeta, ApiErrorResponse } from '@aiget/types';

const normalizeApiOrigin = (value: string) => value.replace(/\/+$/, '');

/**
 * 生产环境默认走 `https://aiget.dev`，避免误走 admin 同源 `/api/v1/*`。
 * 本地开发默认走空字符串，让 Vite proxy 代理 `/api/*` 到后端。
 */
export const API_BASE_URL = (() => {
  const explicit = (import.meta.env.VITE_API_URL ?? '').trim();
  if (explicit) {
    return normalizeApiOrigin(explicit);
  }
  return import.meta.env.DEV ? '' : 'https://aiget.dev';
})();

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
    const token = getAccessToken();
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
      useAuthStore.getState().clearSession();
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
      this.handleAuthError(response.status);
      this.throwApiError(response.status, json);
    }

    // 成功响应 - 自动解包 data 字段
    return (json as { data: T }).data;
  }

  /**
   * 发送请求
   */
  private refreshPromise: Promise<string | null> | null = null;

  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = authClient
      .refresh()
      .then(async (result) => {
        useAuthStore.getState().setAccessToken(result.accessToken);
        if (!useAuthStore.getState().user) {
          const me = await authClient.me(result.accessToken);
          useAuthStore.getState().setUser(toAuthUser(me));
        }
        return result.accessToken;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        return null;
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  private async fetchWithRefresh(fetcher: () => Promise<Response>): Promise<Response> {
    const response = await fetcher();
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return fetcher();
      }
    }
    return response;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await this.fetchWithRefresh(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: this.buildHeaders(options?.headers),
      })
    );

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
    const response = await this.fetchWithRefresh(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        headers: this.buildHeaders(),
      })
    );

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
  /**
   * GET Blob 请求（用于文件下载）
   */
  async getBlob(endpoint: string): Promise<Blob> {
    const token = getAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await this.fetchWithRefresh(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        headers,
      })
    );

    if (!response.ok) {
      this.handleAuthError(response.status);
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed');
    }

    return response.blob();
  }

  /**
   * POST Blob 请求（用于导出等需要 POST 请求的文件下载）
   */
  async postBlob(endpoint: string, data?: unknown): Promise<Blob> {
    const response = await this.fetchWithRefresh(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      })
    );

    if (!response.ok) {
      this.handleAuthError(response.status);
      throw new ApiError(response.status, 'DOWNLOAD_ERROR', 'Download failed');
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
