/**
 * [PROVIDES]: ApiKeyClient - API Key 认证请求封装
 * [DEPENDS]: fetch
 * [POS]: Console 调用公网 API 的基础客户端
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ApiKeyClientOptions {
  apiKey: string;
  timeout?: number;
}

export class ApiKeyClient {
  private apiKey: string;
  private timeout: number;

  constructor(options: ApiKeyClientOptions) {
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 60000;
  }

  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const apiKey = this.apiKey.trim();
    if (!apiKey) {
      throw new ApiKeyClientError('API key is required', 400, 'MISSING_API_KEY');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new ApiKeyClientError(
          error.message || `Request failed with status ${response.status}`,
          response.status,
          error.code
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiKeyClientError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiKeyClientError('Request timeout', 408, 'TIMEOUT');
      }

      throw new ApiKeyClientError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        'UNKNOWN'
      );
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export class ApiKeyClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiKeyClientError';
    this.status = status;
    this.code = code || 'ERROR';
  }
}
