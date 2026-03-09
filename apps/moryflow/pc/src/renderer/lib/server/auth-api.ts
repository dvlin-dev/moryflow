/**
 * [PROVIDES]: signInWithEmail/startEmailSignUp/verifyEmailSignUpOTP/completeEmailSignUp/sendForgotPasswordOTP/resetPasswordWithOTP
 * [DEPENDS]: client, auth-session, MEMBERSHIP_API_URL
 * [POS]: Desktop 端 Token-first Auth API 封装
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { AUTH_API } from '@moryflow/api';
import { createApiTransport, ServerApiError } from '@moryflow/api/client';
import type { BetterAuthError } from './types';
import { MEMBERSHIP_API_URL } from './const';
import { syncAuthSessionFromPayload } from './auth-session';

const DEVICE_PLATFORM = 'desktop';
const AUTH_SOCIAL_GOOGLE_START_PATH = AUTH_API.SOCIAL_GOOGLE_START;
const AUTH_SOCIAL_GOOGLE_START_CHECK_PATH = AUTH_API.SOCIAL_GOOGLE_START_CHECK;
const AUTH_SOCIAL_GOOGLE_EXCHANGE_PATH = AUTH_API.SOCIAL_GOOGLE_EXCHANGE;

const authTransport = createApiTransport({
  baseUrl: MEMBERSHIP_API_URL,
});

type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

type TokenAuthPayload = {
  accessToken?: string;
  accessTokenExpiresAt?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
  user?: AuthUser;
  code?: string;
  message?: string;
  detail?: string;
};

type AuthResponse = {
  user?: AuthUser;
  error?: BetterAuthError;
};

type VerifyEmailSignUpOTPResponse = {
  signupToken?: string;
  signupTokenExpiresAt?: string;
  error?: BetterAuthError;
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

export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  const { payload, error } = await postTokenAuth(
    AUTH_API.SIGN_IN_EMAIL,
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
    await authTransport.request<{ success: true }>({
      path: AUTH_API.SIGN_UP_EMAIL_START,
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
): Promise<VerifyEmailSignUpOTPResponse> {
  try {
    const payload = await authTransport.request<{
      signupToken: string;
      signupTokenExpiresAt: string;
    }>({
      path: AUTH_API.SIGN_UP_EMAIL_VERIFY_OTP,
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
): Promise<AuthResponse> {
  const { payload, error } = await postTokenAuth(
    AUTH_API.SIGN_UP_EMAIL_COMPLETE,
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

export async function sendForgotPasswordOTP(email: string): Promise<{ error?: BetterAuthError }> {
  try {
    await authTransport.request<{ success: boolean }>({
      path: AUTH_API.FORGOT_PASSWORD_EMAIL_OTP,
      method: 'POST',
      headers: {
        'X-App-Platform': DEVICE_PLATFORM,
      },
      body: { email },
    });

    return {};
  } catch (error) {
    return {
      error: parseAuthError(error, 'Failed to send reset code'),
    };
  }
}

export async function resetPasswordWithOTP(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ error?: BetterAuthError }> {
  try {
    await authTransport.request<{ success: boolean }>({
      path: AUTH_API.EMAIL_OTP_RESET_PASSWORD,
      method: 'POST',
      headers: {
        'X-App-Platform': DEVICE_PLATFORM,
      },
      body: {
        email,
        otp,
        password: newPassword,
      },
    });

    return {};
  } catch (error) {
    return {
      error: parseAuthError(error, 'Password reset failed'),
    };
  }
}

const buildGoogleStartUrl = (nonce: string): string => {
  const baseUrl = MEMBERSHIP_API_URL.replace(/\/+$/, '');
  const startUrl = new URL(`${baseUrl}${AUTH_SOCIAL_GOOGLE_START_PATH}`);
  startUrl.searchParams.set('nonce', nonce);
  return startUrl.toString();
};

export async function startGoogleSignIn(nonce: string): Promise<{
  url?: string;
  error?: BetterAuthError;
}> {
  const normalizedNonce = nonce.trim();
  if (!normalizedNonce) {
    return {
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid oauth nonce',
      },
    };
  }

  try {
    await authTransport.request<void>({
      path: AUTH_SOCIAL_GOOGLE_START_CHECK_PATH,
      method: 'GET',
      query: { nonce: normalizedNonce },
    });
  } catch (error) {
    return {
      error: parseAuthError(error, 'Failed to start Google sign in'),
    };
  }

  return { url: buildGoogleStartUrl(normalizedNonce) };
}

export async function exchangeGoogleCode(code: string, nonce: string): Promise<AuthResponse> {
  const { payload, error } = await postTokenAuth(
    AUTH_SOCIAL_GOOGLE_EXCHANGE_PATH,
    { code, nonce },
    'Google sign in failed'
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
