/**
 * [PROVIDES]: signInWithEmail/startEmailSignUp/verifyEmailSignUpOTP/completeEmailSignUp
 * [DEPENDS]: auth-client, auth-session
 * [POS]: Mobile 端 Better Auth API 封装
 */

import { createApiTransport, ServerApiError } from '@moryflow/api/client';
import type { BetterAuthError } from './types';
import { AUTH_BASE_URL } from './auth-client';
import { DEVICE_PLATFORM } from './auth-platform';
import { syncAuthSessionFromPayload } from './auth-session';

const AUTH_API_PREFIX = '/api/v1/auth';

const authTransport = createApiTransport({
  baseUrl: AUTH_BASE_URL,
});

// ============ 类型定义 ============

export interface BetterAuthResponse {
  user?: { id: string; email: string; name?: string };
  error?: BetterAuthError;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface EmailSignUpVerificationResponse {
  signupToken?: string;
  signupTokenExpiresAt?: string;
  error?: BetterAuthError;
}

type TokenAuthPayload = {
  user?: AuthUser;
  code?: string;
  message?: string;
  detail?: string;
};

const parseAuthError = (error: unknown, fallback: string): BetterAuthError => {
  if (error instanceof ServerApiError) {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message || fallback,
    };
  }

  return {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed',
  };
};

const postTokenAuth = async (
  path: string,
  body: Record<string, string>,
  fallbackError: string
): Promise<{ payload: TokenAuthPayload | null; error?: BetterAuthError }> => {
  try {
    const payload = await authTransport.request<TokenAuthPayload>({
      path,
      method: 'POST',
      headers: {
        'X-App-Platform': DEVICE_PLATFORM,
      },
      body,
    });

    return { payload };
  } catch (error) {
    return {
      payload: null,
      error: parseAuthError(error, fallbackError),
    };
  }
};

// ============ API 方法 ============

/**
 * 邮箱登录
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<BetterAuthResponse> {
  const { payload, error } = await postTokenAuth(
    `${AUTH_API_PREFIX}/sign-in/email`,
    { email, password },
    'Sign in failed'
  );

  if (error) {
    return { error };
  }

  const synced = await syncAuthSessionFromPayload(payload);
  if (!synced) {
    return { error: { code: 'INVALID_RESPONSE', message: 'Invalid authentication response' } };
  }

  return { user: payload?.user };
}

export async function startEmailSignUp(email: string): Promise<{ error?: BetterAuthError }> {
  try {
    await authTransport.request<{ success: boolean }>({
      path: `${AUTH_API_PREFIX}/sign-up/email/start`,
      method: 'POST',
      headers: {
        'X-App-Platform': DEVICE_PLATFORM,
      },
      body: { email },
    });

    return {};
  } catch (error) {
    return {
      error: parseAuthError(error, 'Sign up failed'),
    };
  }
}

export async function verifyEmailSignUpOTP(
  email: string,
  otp: string
): Promise<EmailSignUpVerificationResponse> {
  try {
    const payload = await authTransport.request<{
      signupToken: string;
      signupTokenExpiresAt: string;
    }>({
      path: `${AUTH_API_PREFIX}/sign-up/email/verify-otp`,
      method: 'POST',
      headers: {
        'X-App-Platform': DEVICE_PLATFORM,
      },
      body: { email, otp },
    });

    return payload;
  } catch (error) {
    return {
      error: parseAuthError(error, 'Verification failed'),
    };
  }
}

export async function completeEmailSignUp(
  signupToken: string,
  password: string
): Promise<BetterAuthResponse> {
  const { payload, error } = await postTokenAuth(
    `${AUTH_API_PREFIX}/sign-up/email/complete`,
    { signupToken, password },
    'Sign up failed'
  );

  if (error) {
    return { error };
  }

  const synced = await syncAuthSessionFromPayload(payload);
  if (!synced) {
    return { error: { code: 'INVALID_RESPONSE', message: 'Invalid authentication response' } };
  }

  return { user: payload?.user };
}

/**
 * 从响应中提取用户信息
 */
export function extractUser(response: BetterAuthResponse): AuthUser | null {
  return response.user || null;
}
