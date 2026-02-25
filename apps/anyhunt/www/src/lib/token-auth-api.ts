/**
 * [PROVIDES]: token-first auth 请求封装（sign-in / verify-email）
 * [DEPENDS]: auth-methods
 * [POS]: www 端 Token-first 登录流程 API 适配层
 */

import { authMethods } from '@/lib/auth/auth-methods';

type TokenAuthUser = {
  id: string;
  email?: string;
  emailVerified?: boolean;
  name?: string | null;
};

type TokenAuthResponse = {
  status?: boolean;
  user?: TokenAuthUser;
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<TokenAuthResponse> => {
  await authMethods.signIn(email, password);
  return { status: true };
};

export const verifyEmailOtpAndCreateSession = async (
  email: string,
  otp: string
): Promise<TokenAuthResponse> => {
  await authMethods.verifyEmailOtp(email, otp);
  return { status: true };
};
