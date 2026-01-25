/**
 * [PROVIDES]: apiClient, ApiClientError
 * [DEPENDS]: fetch, auth-session
 * [POS]: www API client for authenticated requests (Bearer + refresh)
 */

import { API_BASE_URL } from './api-base';
import { refreshAccessToken, logout } from './auth-session';
import { authStore, isAccessTokenExpiringSoon } from '@/stores/auth-store';

/**
 * API Error
 */
export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
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
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

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

  private async safeParseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  private throwApiError(status: number, json: unknown): never {
    const errorResponse = json as ApiErrorResponse;
    throw new ApiClientError(
      status,
      errorResponse.error?.code || 'UNKNOWN_ERROR',
      errorResponse.error?.message || `Request failed (${status})`,
      errorResponse.error?.details
    );
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new ApiClientError(response.status, 'NETWORK_ERROR', 'Request failed');
      }
      return {} as T;
    }

    const json = await this.safeParseJson(response);

    if (!response.ok || (json as { success?: boolean }).success === false) {
      this.throwApiError(response.status, json);
    }

    return (json as { data: T }).data;
  }

  private async fetchWithAuth(
    endpoint: string,
    options?: RequestInit,
    attempt = 0
  ): Promise<Response> {
    const { accessToken, accessTokenExpiresAt } = authStore.getState();
    if (accessToken && isAccessTokenExpiringSoon(accessTokenExpiresAt)) {
      await refreshAccessToken();
    }

    const token = authStore.getState().accessToken;
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: this.buildHeaders(options?.headers, token),
      credentials: 'include',
    });

    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed && attempt === 0) {
        return this.fetchWithAuth(endpoint, options, attempt + 1);
      }
      await logout();
    }

    return response;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await this.fetchWithAuth(endpoint, options);
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
}

export const apiClient = new ApiClient(API_BASE_URL);
