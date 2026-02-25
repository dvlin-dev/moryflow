/**
 * [PROVIDES]: signInWithEmail/signUpWithEmail/sendVerificationOTP/verifyEmailOTP
 * [DEPENDS]: auth-client, auth-session
 * [POS]: Mobile 端 Better Auth API 封装
 */

import { createApiTransport, ServerApiError } from '@anyhunt/api/client';
import type { BetterAuthError } from './types';
import { AUTH_BASE_URL, authClient } from './auth-client';
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

/**
 * 邮箱注册
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<BetterAuthResponse> {
  try {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: name || email.split('@')[0],
    });

    if (error) {
      return {
        error: { code: error.code || 'UNKNOWN', message: error.message || 'Sign up failed' },
      };
    }

    return { user: data?.user };
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } };
  }
}

/**
 * 发送邮箱验证码
 */
export async function sendVerificationOTP(
  email: string,
  type: 'email-verification' | 'sign-in' | 'forget-password' = 'email-verification'
): Promise<{ error?: BetterAuthError }> {
  try {
    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type,
    });

    if (error) {
      return {
        error: { code: error.code || 'UNKNOWN', message: error.message || 'Failed to send' },
      };
    }

    return {};
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } };
  }
}

/**
 * 验证邮箱
 */
export async function verifyEmailOTP(
  email: string,
  otp: string
): Promise<{ error?: BetterAuthError }> {
  const { payload, error } = await postTokenAuth(
    `${AUTH_API_PREFIX}/email-otp/verify-email`,
    { email, otp },
    'Verification failed'
  );

  if (error) {
    return { error };
  }

  const synced = await syncAuthSessionFromPayload(payload);
  if (!synced) {
    return { error: { code: 'INVALID_RESPONSE', message: 'Invalid authentication response' } };
  }

  return {};
}

/**
 * 从响应中提取用户信息
 */
export function extractUser(response: BetterAuthResponse): AuthUser | null {
  return response.user || null;
}
