/**
 * [DEFINES]: 认证客户端类型
 * [USED_BY]: packages/auth-client
 * [POS]: 认证客户端类型定义
 */

import type { SubscriptionTier } from '@aiget/types';

export type ClientType = 'web' | 'native';

export interface AuthClientOptions {
  baseUrl: string;
  clientType?: ClientType;
  fetcher?: typeof fetch;
  headers?: Record<string, string>;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  next: 'VERIFY_EMAIL_OTP';
}

export interface VerifyEmailOtpInput {
  email: string;
  otp: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  tier: SubscriptionTier;
  isAdmin: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface RefreshOptions {
  refreshToken?: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  emailVerified: boolean;
  tier: SubscriptionTier;
  creditBalance: number;
  isAdmin: boolean;
  profile: {
    nickname: string | null;
    avatar: string | null;
    locale: string;
    timezone: string;
  } | null;
}

export interface OAuthStartInput {
  callbackURL?: string;
}

export interface OAuthStartResponse {
  url: string;
}

export interface OAuthTokenInput {
  idToken: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  next?: string;
}

export interface AuthClient {
  register(input: RegisterInput): Promise<RegisterResponse>;
  verifyEmailOtp(input: VerifyEmailOtpInput): Promise<AuthResponse>;
  login(input: LoginInput): Promise<AuthResponse>;
  refresh(options?: RefreshOptions): Promise<RefreshResponse>;
  logout(options?: RefreshOptions): Promise<{ success: true }>;
  me(accessToken: string): Promise<MeResponse>;
  googleStart(input?: OAuthStartInput): Promise<OAuthStartResponse>;
  googleToken(input: OAuthTokenInput): Promise<AuthResponse>;
  appleStart(input?: OAuthStartInput): Promise<OAuthStartResponse>;
  appleToken(input: OAuthTokenInput): Promise<AuthResponse>;
}
