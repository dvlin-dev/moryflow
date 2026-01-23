/**
 * [PROVIDES]: signInWithEmail/signUpWithEmail/sendVerificationOTP/verifyEmailOTP
 * [DEPENDS]: auth-client
 * [POS]: Mobile 端 Better Auth API 封装
 */

import type { BetterAuthError } from './types';
import { authClient } from './auth-client';

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

// ============ API 方法 ============

/**
 * 邮箱登录
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<BetterAuthResponse> {
  try {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      return {
        error: { code: error.code || 'UNKNOWN', message: error.message || 'Sign in failed' },
      };
    }

    return { user: data?.user };
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } };
  }
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
  try {
    const { error } = await authClient.emailOtp.verifyEmail({
      email,
      otp,
    });

    if (error) {
      return {
        error: { code: error.code || 'UNKNOWN', message: error.message || 'Verification failed' },
      };
    }

    return {};
  } catch {
    return { error: { code: 'NETWORK_ERROR', message: 'Network connection failed' } };
  }
}

/**
 * 从响应中提取用户信息
 */
export function extractUser(response: BetterAuthResponse): AuthUser | null {
  return response.user || null;
}
