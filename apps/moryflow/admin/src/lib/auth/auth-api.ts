/**
 * [PROVIDES]: Moryflow Admin Auth API（sign-in / refresh / logout / me）
 * [DEPENDS]: API_BASE_URL
 * [POS]: 认证网络层（仅请求，不修改 store）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { createApiTransport, ServerApiError } from '@anyhunt/api/client';
import { API_BASE_URL } from '@/lib/api-base';
import type { AuthTokenBundle, AuthUser } from '@/stores/auth';

type AuthTokenResponse = Partial<AuthTokenBundle>;
type AdminMeResponse = { user?: AuthUser };

const resolvedBaseUrl =
  API_BASE_URL || (typeof window === 'undefined' ? 'http://localhost' : window.location.origin);

const authTransport = createApiTransport({
  baseUrl: resolvedBaseUrl,
});

const isTokenBundle = (payload: unknown): payload is AuthTokenBundle => {
  const data = payload as AuthTokenResponse | null;
  return Boolean(
    data &&
    typeof data.accessToken === 'string' &&
    typeof data.accessTokenExpiresAt === 'string' &&
    typeof data.refreshToken === 'string' &&
    typeof data.refreshTokenExpiresAt === 'string'
  );
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ServerApiError && error.message.trim()) {
    return error.message;
  }
  return fallback;
};

export async function fetchCurrentAdmin(token: string): Promise<AuthUser | null> {
  try {
    const payload = await authTransport.request<AdminMeResponse>({
      path: '/api/v1/admin/me',
      headers: { Authorization: `Bearer ${token}` },
    });

    return payload.user ?? null;
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw new Error(getErrorMessage(error, 'Failed to fetch admin profile'));
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthTokenBundle> {
  try {
    const payload = await authTransport.request<AuthTokenBundle>({
      path: '/api/v1/auth/sign-in/email',
      method: 'POST',
      body: { email, password },
    });

    if (!isTokenBundle(payload)) {
      throw new Error('Invalid authentication response');
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid authentication response') {
      throw error;
    }
    throw new Error(getErrorMessage(error, 'Login failed'));
  }
}

export async function refreshByToken(refreshToken: string): Promise<AuthTokenBundle | null> {
  try {
    const payload = await authTransport.request<AuthTokenBundle>({
      path: '/api/v1/auth/refresh',
      method: 'POST',
      body: { refreshToken },
    });

    if (!isTokenBundle(payload)) {
      return null;
    }

    return payload;
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw new Error('refresh_failed');
  }
}

export async function logoutByToken(refreshToken: string): Promise<void> {
  try {
    await authTransport.request<void>({
      path: '/api/v1/auth/logout',
      method: 'POST',
      body: { refreshToken },
    });
  } catch {
    // ignore
  }
}
