/**
 * [PROVIDES]: authClient, useSession
 * [DEPENDS]: better-auth/react, better-auth/client/plugins
 * [POS]: www 端 Better Auth 客户端，用于统一登录
 */
import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

/**
 * 解析 Auth 服务地址
 * - 开发环境：使用相对路径（通过 Vite proxy）或 VITE_API_URL
 * - 生产环境：使用 server.anyhunt.app
 */
function resolveAuthBaseUrl(): string {
  const apiUrl = (import.meta.env.VITE_API_URL ?? '').trim();

  // 有显式配置
  if (apiUrl) {
    return apiUrl.replace(/\/+$/, '') + '/api/auth';
  }

  // 开发环境：使用相对路径
  if (import.meta.env.DEV) {
    return '/api/auth';
  }

  // 生产环境默认值
  return 'https://server.anyhunt.app/api/auth';
}

/**
 * Better Auth 客户端实例
 *
 * 使用方式：
 * - 登录：authClient.signIn.email({ email, password })
 * - 注册：authClient.signUp.email({ email, password, name })
 * - 登出：authClient.signOut()
 * - Email OTP：authClient.emailOtp.verifyEmail({ email, otp })
 * - 密码重置：authClient.forgetPassword({ email, redirectTo })
 */
export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [emailOTPClient()],
});

/**
 * 获取当前会话的 React Hook
 *
 * @example
 * function UserMenu() {
 *   const { data: session, isPending } = useSession();
 *   if (isPending) return <Skeleton />;
 *   if (!session) return <LoginButton />;
 *   return <UserAvatar user={session.user} />;
 * }
 */
export const useSession = authClient.useSession;

/**
 * 会话类型（从 authClient 推断）
 */
export type Session = NonNullable<ReturnType<typeof useSession>['data']>;
export type User = Session['user'];
