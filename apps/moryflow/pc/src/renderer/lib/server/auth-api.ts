/**
 * [PROVIDES]: signInWithEmail/signUpWithEmail/sendVerificationOTP/verifyEmailOTP/sendForgotPasswordOTP/resetPasswordWithOTP
 * [DEPENDS]: client, auth-session, MEMBERSHIP_API_URL
 * [POS]: Desktop 端 Token-first Auth API 封装
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { AUTH_API } from '@moryflow/api';
import type { MembershipAuthResult, MembershipAuthUser } from '@shared/ipc';
import { createApiTransport, ServerApiError } from '@moryflow/api/client';
import type { BetterAuthError } from './types';
import { authClient } from './client';
import { MEMBERSHIP_API_URL } from './const';
import { syncAccessSessionFromPayload } from './auth-session';

const DEVICE_PLATFORM = 'desktop';
const AUTH_SOCIAL_GOOGLE_START_PATH = AUTH_API.SOCIAL_GOOGLE_START;
const AUTH_SOCIAL_GOOGLE_START_CHECK_PATH = AUTH_API.SOCIAL_GOOGLE_START_CHECK;

const authTransport = createApiTransport({
  baseUrl: MEMBERSHIP_API_URL,
});

type AuthResponse = {
  user?: MembershipAuthUser;
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

const missingDesktopAuthBridgeError = (): BetterAuthError => ({
  code: 'UNAVAILABLE',
  message: 'Desktop auth bridge is unavailable',
});

const completeDesktopTokenAuth = async (result: MembershipAuthResult): Promise<AuthResponse> => {
  if (!result.ok) {
    return { error: result.error };
  }

  const synced = await syncAccessSessionFromPayload(result.payload);
  if (!synced) {
    return { error: { code: 'INVALID_RESPONSE', message: 'Invalid authentication response' } };
  }

  return { user: result.user };
};

const runDesktopTokenAuth = async (
  execute: () => Promise<MembershipAuthResult>,
  fallbackError: string
): Promise<AuthResponse> => {
  try {
    return completeDesktopTokenAuth(await execute());
  } catch (error) {
    return { error: parseAuthError(error, fallbackError) };
  }
};

export async function signInWithEmail(email: string, password: string): Promise<AuthResponse> {
  const desktopMembership = window.desktopAPI?.membership;
  if (!desktopMembership?.signInWithEmail) {
    return { error: missingDesktopAuthBridgeError() };
  }
  return runDesktopTokenAuth(
    () => desktopMembership.signInWithEmail(email, password),
    'Sign in failed'
  );
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

    return { user: data?.user as MembershipAuthUser | undefined };
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
  const desktopMembership = window.desktopAPI?.membership;
  if (!desktopMembership?.verifyEmailOTP) {
    return { error: missingDesktopAuthBridgeError() };
  }
  const result = await runDesktopTokenAuth(
    () => desktopMembership.verifyEmailOTP(email, otp),
    'Verification failed'
  );
  return result.error ? { error: result.error } : {};
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

const buildGoogleStartUrl = (nonce: string, redirectUri?: string): string => {
  const baseUrl = MEMBERSHIP_API_URL.replace(/\/+$/, '');
  const startUrl = new URL(`${baseUrl}${AUTH_SOCIAL_GOOGLE_START_PATH}`);
  startUrl.searchParams.set('nonce', nonce);
  if (redirectUri?.trim()) {
    startUrl.searchParams.set('redirectUri', redirectUri.trim());
  }
  return startUrl.toString();
};

export async function startGoogleSignIn(
  nonce: string,
  redirectUri?: string
): Promise<{
  url?: string;
  error?: BetterAuthError;
}> {
  const normalizedNonce = nonce.trim();
  const normalizedRedirectUri = redirectUri?.trim();
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
      query: normalizedRedirectUri
        ? { nonce: normalizedNonce, redirectUri: normalizedRedirectUri }
        : { nonce: normalizedNonce },
    });
  } catch (error) {
    return {
      error: parseAuthError(error, 'Failed to start Google sign in'),
    };
  }

  return { url: buildGoogleStartUrl(normalizedNonce, normalizedRedirectUri) };
}

export async function exchangeGoogleCode(code: string, nonce: string): Promise<AuthResponse> {
  const desktopMembership = window.desktopAPI?.membership;
  if (!desktopMembership?.exchangeGoogleCode) {
    return { error: missingDesktopAuthBridgeError() };
  }
  return runDesktopTokenAuth(
    () => desktopMembership.exchangeGoogleCode(code, nonce),
    'Google sign in failed'
  );
}
