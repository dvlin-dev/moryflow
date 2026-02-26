/**
 * [PROVIDES]: WWW Auth API（sign-in / verify-email / refresh / logout / me）
 * [DEPENDS]: API_BASE_URL
 * [POS]: 认证网络层（仅请求，不修改 store）
 */

import { API_BASE_URL } from '@/lib/api-base';
import { createApiTransport } from '@moryflow/api/client';
import type { AuthTokenBundle, AuthUser } from '@/stores/auth-store';
import { isUnauthorizedLikeError, resolveErrorMessage } from './auth-error';

type TokenAuthPayload = Partial<AuthTokenBundle> & {
  user?: Partial<AuthUser>;
  status?: boolean;
  code?: string;
  message?: string;
  detail?: string;
};

const resolvedBaseUrl =
  API_BASE_URL || (typeof window === 'undefined' ? 'http://localhost' : window.location.origin);

const authTransport = createApiTransport({
  baseUrl: resolvedBaseUrl,
});

const INVALID_AUTH_RESPONSE_MESSAGE = 'Invalid authentication response';

const isInvalidAuthResponseError = (error: unknown): error is Error =>
  error instanceof Error && error.message === INVALID_AUTH_RESPONSE_MESSAGE;

const isTokenBundle = (payload: unknown): payload is AuthTokenBundle => {
  const data = payload as TokenAuthPayload | null;
  return Boolean(
    data &&
    typeof data.accessToken === 'string' &&
    typeof data.accessTokenExpiresAt === 'string' &&
    typeof data.refreshToken === 'string' &&
    typeof data.refreshTokenExpiresAt === 'string'
  );
};

const mapAuthUser = (payload: unknown): AuthUser | null => {
  const data = payload as Partial<AuthUser> | null;
  if (!data || typeof data.id !== 'string' || typeof data.email !== 'string') {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    name: typeof data.name === 'string' || data.name === null ? data.name : null,
    image: typeof data.image === 'string' || data.image === null ? data.image : null,
    emailVerified: typeof data.emailVerified === 'boolean' ? data.emailVerified : undefined,
  };
};

export async function fetchCurrentUser(token: string): Promise<AuthUser | null> {
  try {
    const payload = await authTransport.request<unknown>({
      path: '/api/v1/app/user/me',
      headers: { Authorization: `Bearer ${token}` },
    });
    return mapAuthUser(payload);
  } catch (error) {
    if (isUnauthorizedLikeError(error)) {
      return null;
    }
    throw new Error(resolveErrorMessage(error, 'Failed to fetch user profile'));
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthTokenBundle> {
  try {
    const payload = await authTransport.request<unknown>({
      path: '/api/v1/auth/sign-in/email',
      method: 'POST',
      body: { email, password },
    });

    if (!isTokenBundle(payload)) {
      throw new Error(INVALID_AUTH_RESPONSE_MESSAGE);
    }

    return payload;
  } catch (error) {
    if (isInvalidAuthResponseError(error)) {
      throw error;
    }
    throw new Error(resolveErrorMessage(error, 'Login failed'));
  }
}

export async function verifyEmailOtpAndCreateSession(
  email: string,
  otp: string
): Promise<AuthTokenBundle> {
  try {
    const payload = await authTransport.request<unknown>({
      path: '/api/v1/auth/email-otp/verify-email',
      method: 'POST',
      body: { email, otp },
    });

    if (!isTokenBundle(payload)) {
      throw new Error(INVALID_AUTH_RESPONSE_MESSAGE);
    }

    return payload;
  } catch (error) {
    if (isInvalidAuthResponseError(error)) {
      throw error;
    }
    throw new Error(resolveErrorMessage(error, 'Verification failed'));
  }
}

export async function refreshByToken(refreshToken: string): Promise<AuthTokenBundle | null> {
  try {
    const payload = await authTransport.request<unknown>({
      path: '/api/v1/auth/refresh',
      method: 'POST',
      body: { refreshToken },
    });

    if (!isTokenBundle(payload)) {
      return null;
    }

    return payload;
  } catch (error) {
    if (isUnauthorizedLikeError(error)) {
      return null;
    }
    throw new Error(resolveErrorMessage(error, 'refresh_failed'));
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
