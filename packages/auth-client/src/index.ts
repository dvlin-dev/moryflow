/**
 * [PROVIDES]: Auth 客户端入口导出
 * [DEPENDS]: ./client, ./types
 * [POS]: 认证客户端包入口
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

export { createAuthClient, AuthClientError } from './client';
export type {
  AuthClient,
  AuthClientOptions,
  AuthResponse,
  AuthUser,
  ClientType,
  ErrorResponse,
  LoginInput,
  MeResponse,
  OAuthStartInput,
  OAuthStartResponse,
  OAuthTokenInput,
  RefreshOptions,
  RefreshResponse,
  RegisterInput,
  RegisterResponse,
  VerifyEmailOtpInput,
} from './types';
