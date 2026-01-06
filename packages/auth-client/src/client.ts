/**
 * [PROVIDES]: createAuthClient, AuthClientError
 * [DEPENDS]: fetch (注入或全局), ./types
 * [POS]: Auth 客户端实现
 */

import type {
  AuthClient,
  AuthClientOptions,
  AuthResponse,
  ErrorResponse,
  LoginInput,
  MeResponse,
  OAuthStartInput,
  OAuthStartResponse,
  OAuthTokenInput,
  RefreshOptions,
  RefreshResponse,
  RegisterInput,
  RegisterResponse,
  VerifyEmailOtpInput,
} from './types';

export class AuthClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly data?: ErrorResponse;

  constructor(message: string, status: number, code?: string, data?: ErrorResponse) {
    super(message);
    this.name = 'AuthClientError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

const buildUrl = (baseUrl: string, path: string) =>
  `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

const parseJson = async <T>(res: Response): Promise<T | undefined> => {
  const text = await res.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
};

export const createAuthClient = (options: AuthClientOptions): AuthClient => {
  if (!options.baseUrl.trim()) {
    throw new AuthClientError('baseUrl is required', 400);
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const clientType = options.clientType ?? 'web';
  const fetcher = options.fetcher ?? fetch;
  const defaultHeaders = options.headers ?? {};

  const request = async <T>(
    path: string,
    init: {
      method?: string;
      body?: unknown;
      accessToken?: string;
      refreshToken?: string;
    } = {}
  ): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': clientType,
      ...defaultHeaders,
    };

    if (init.accessToken) {
      headers.Authorization = `Bearer ${init.accessToken}`;
    }

    if (init.refreshToken) {
      headers.Authorization = `Bearer ${init.refreshToken}`;
    }

    const res = await fetcher(buildUrl(baseUrl, path), {
      method: init.method ?? 'POST',
      headers,
      credentials: 'include',
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const data = await parseJson<T | ErrorResponse>(res);
    if (!res.ok) {
      const error = data as ErrorResponse | undefined;
      const message = error?.message ?? res.statusText ?? 'Request failed';
      throw new AuthClientError(message, res.status, error?.code, error);
    }

    return data as T;
  };

  const ensureNativeRefreshToken = (refreshToken?: string) => {
    if (clientType === 'native' && !refreshToken) {
      throw new AuthClientError('Refresh token is required for native clients', 400);
    }
  };

  return {
    register: (input: RegisterInput) => request<RegisterResponse>('/register', { body: input }),
    verifyEmailOtp: (input: VerifyEmailOtpInput) =>
      request<AuthResponse>('/verify-email-otp', { body: input }),
    login: (input: LoginInput) => request<AuthResponse>('/login', { body: input }),
    refresh: (options?: RefreshOptions) => {
      ensureNativeRefreshToken(options?.refreshToken);
      return request<RefreshResponse>('/refresh', {
        refreshToken: options?.refreshToken,
      });
    },
    logout: (options?: RefreshOptions) => {
      ensureNativeRefreshToken(options?.refreshToken);
      return request<{ success: true }>('/logout', {
        refreshToken: options?.refreshToken,
      });
    },
    me: (accessToken: string) => {
      if (!accessToken) {
        throw new AuthClientError('Access token is required', 400);
      }
      return request<MeResponse>('/me', { method: 'GET', accessToken });
    },
    googleStart: (input?: OAuthStartInput) =>
      request<OAuthStartResponse>('/google/start', { body: input ?? {} }),
    googleToken: (input: OAuthTokenInput) =>
      request<AuthResponse>('/google/token', { body: input }),
    appleStart: (input?: OAuthStartInput) =>
      request<OAuthStartResponse>('/apple/start', { body: input ?? {} }),
    appleToken: (input: OAuthTokenInput) => request<AuthResponse>('/apple/token', { body: input }),
  };
};
