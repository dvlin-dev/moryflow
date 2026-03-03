/**
 * [PROVIDES]: signInWithEmail/signUpWithEmail/sendVerificationOTP/verifyEmailOTP
 * [DEPENDS]: client, auth-session, MEMBERSHIP_API_URL
 * [POS]: Desktop 端 Token-first Auth API 封装
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { AUTH_API } from '@moryflow/api';
import { createApiTransport, ServerApiError } from '@moryflow/api/client';
import type { BetterAuthError } from './types';
import { authClient } from './client';
import { MEMBERSHIP_API_URL } from './const';
import { syncAuthSessionFromPayload } from './auth-session';

const DEVICE_PLATFORM = 'desktop';
const AUTH_SIGN_IN_SOCIAL_PATH = AUTH_API.SIGN_IN_SOCIAL;
const AUTH_SOCIAL_GOOGLE_BRIDGE_CALLBACK_PATH = AUTH_API.SOCIAL_GOOGLE_BRIDGE_CALLBACK;
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

type SocialSignInPayload = {
  url?: string;
  redirect?: boolean;
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

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> {
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

    return { user: data?.user as AuthUser | undefined };
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } };
  }
}

export async function sendVerificationOTP(
  email: string,
  type: 'email-verification' | 'sign-in' | 'forget-password' = 'email-verification'
): Promise<{ error?: BetterAuthError }> {
  try {
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type });
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

export async function verifyEmailOTP(
  email: string,
  otp: string
): Promise<{ error?: BetterAuthError }> {
  const { payload, error } = await postTokenAuth(
    '/api/v1/auth/email-otp/verify-email',
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

const buildGoogleBridgeCallbackUrl = (nonce: string): string => {
  const baseUrl = MEMBERSHIP_API_URL.replace(/\/+$/, '');
  const callbackUrl = new URL(`${baseUrl}${AUTH_SOCIAL_GOOGLE_BRIDGE_CALLBACK_PATH}`);
  callbackUrl.searchParams.set('nonce', nonce);
  return callbackUrl.toString();
};

export async function startGoogleSignIn(
  nonce: string
): Promise<{ url?: string; error?: BetterAuthError }> {
  try {
    const payload = await authTransport.request<SocialSignInPayload>({
      path: AUTH_SIGN_IN_SOCIAL_PATH,
      method: 'POST',
      headers: {
        'X-App-Platform': DEVICE_PLATFORM,
      },
      body: {
        provider: 'google',
        disableRedirect: true,
        callbackURL: buildGoogleBridgeCallbackUrl(nonce),
      },
    });

    if (!payload?.url || typeof payload.url !== 'string') {
      return {
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Invalid authentication response',
        },
      };
    }

    return { url: payload.url };
  } catch (error) {
    return { error: parseAuthError(error, 'Failed to start Google sign in') };
  }
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
