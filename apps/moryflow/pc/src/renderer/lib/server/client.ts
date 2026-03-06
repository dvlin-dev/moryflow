import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { MEMBERSHIP_API_URL } from './const';

const AUTH_BASE_PATH = '/api/v1/auth';
const AUTH_BASE_URL = `${MEMBERSHIP_API_URL.replace(/\/+$/, '')}${AUTH_BASE_PATH}`;

/**
 * Better Auth 客户端
 * 仅用于注册发码等身份能力（不承担业务 Token 会话）
 */
export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  plugins: [emailOTPClient()],
});
