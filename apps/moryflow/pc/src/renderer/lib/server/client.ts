import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { MEMBERSHIP_API_URL } from './const';

/**
 * Better Auth 客户端
 * 使用 Cookie 维持 session（用于获取 refresh token）
 */
export const authClient = createAuthClient({
  baseURL: MEMBERSHIP_API_URL,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, emailOtp } = authClient;
