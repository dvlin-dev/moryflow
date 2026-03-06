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
    return apiUrl.replace(/\/+$/, '') + '/api/v1/auth';
  }

  // 开发环境：使用相对路径
  if (import.meta.env.DEV) {
    return '/api/v1/auth';
  }

  // 生产环境默认值
  return 'https://server.anyhunt.app/api/v1/auth';
}

/**
 * Better Auth 客户端实例
 *
 * 使用方式：
 * - 注册：authClient.signUp.email({ email, password, name })
 * - 发送注册/重置 OTP：authClient.emailOtp.sendVerificationOtp(...)
 * - 密码重置：authClient.forgetPassword({ email, redirectTo })
 *
 * 说明：
 * - 登录与邮箱验证已迁移到 Token-first 接口（见 token-auth-api.ts）
 * - 该客户端仅保留 Better Auth 的辅助流程（注册发码、忘记密码等）
 */
export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
  plugins: [emailOTPClient()],
});
