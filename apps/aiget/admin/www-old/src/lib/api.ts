/**
 * [PROVIDES]: API 请求工具
 * [DEPENDS]: fetch
 * [POS]: 统一管理后台 API 客户端
 */

const API_BASE = '/api';

let apiAccessToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  apiAccessToken = token;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new ApiError(res.status, 'Failed to refresh session');
  }

  const data = (await res.json().catch(() => null)) as { accessToken?: unknown } | null;
  if (!data || typeof data.accessToken !== 'string') {
    throw new ApiError(401, 'Invalid refresh response');
  }

  setApiAccessToken(data.accessToken);
  return data.accessToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}, attempt = 0): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(apiAccessToken ? { Authorization: `Bearer ${apiAccessToken}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });

  const shouldRetry =
    res.status === 401 &&
    attempt === 0 &&
    !endpoint.startsWith('/v1/auth/') &&
    endpoint !== '/v1/auth/refresh';

  if (shouldRetry) {
    try {
      await refreshAccessToken();
      return request<T>(endpoint, options, attempt + 1);
    } catch {
      setApiAccessToken(null);
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || 'Request failed', data);
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
