/**
 * [INPUT]: PrismaClient + OTP 发送函数 + 安全选项（CSRF/Origin）
 * [OUTPUT]: Better Auth 实例（web/device 分流）
 * [POS]: Auth 核心配置入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { betterAuth, APIError } from 'better-auth';
import { bearer, emailOTP } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '../../generated/prisma/client';
import { getAllowedOrigins } from '../common/utils';
import { isDisposableEmail } from './email-validator';

/**
 * Create Better Auth instance with Prisma adapter
 *
 * Better Auth 提供的功能：
 * - Email/Password 认证
 * - Email OTP 验证
 * - Session 管理
 * - 支持第三方登录（Google/Apple）
 *
 * 认证方式：
 * - Web 端：Cookie（HttpOnly, Secure, SameSite 保护）
 * - API/Mobile：Bearer Token（通过 bearer 插件支持）
 *
 * Bearer Token 使用说明：
 * - 登录成功后从响应头 `set-auth-token` 获取 token
 * - 后续请求通过 `Authorization: Bearer <token>` 携带
 * - token 就是 session token，与 Cookie 共用同一套 session 系统
 */
export interface BetterAuthOptions {
  disableCSRFCheck?: boolean;
}

export function createBetterAuth(
  prisma: PrismaClient,
  sendOTP: (email: string, otp: string) => Promise<void>,
  options: BetterAuthOptions = {},
) {
  // M4 Fix: 验证 BETTER_AUTH_SECRET
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'BETTER_AUTH_SECRET must be set and at least 32 characters long',
    );
  }

  const trustedOrigins = getAllowedOrigins();

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    secret,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    emailAndPassword: {
      enabled: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    trustedOrigins,
    advanced: {
      // 允许无 Origin 的请求（移动端需要）
      // React Native、Electron 等客户端不会发送 Origin header
      disableCSRFCheck: options.disableCSRFCheck ?? false,
    },
    // 数据库钩子：防止已删除用户创建新 session
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { deletedAt: true },
            });
            if (user?.deletedAt) {
              throw new APIError('FORBIDDEN', {
                message: 'Account has been deleted',
              });
            }
            return { data: session };
          },
        },
      },
    },
    plugins: [
      // Bearer Token 插件：允许通过 Authorization: Bearer <token> 进行认证
      // 适用于 OpenAI 兼容 API、移动应用、CLI 工具等非浏览器场景
      bearer(),
      // Email OTP 插件：用于忘记密码等场景
      // 注意：注册流程使用 PreRegisterModule 的预注册验证，不再自动发送验证码
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type === 'email-verification') {
            // 检查是否临时邮箱
            if (isDisposableEmail(email)) {
              throw new APIError('BAD_REQUEST', {
                message: 'This email is not supported.',
              });
            }
            await sendOTP(email, otp);
          }
        },
        otpLength: 6,
        expiresIn: 300, // 5 分钟
        allowedAttempts: 3,
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createBetterAuth>;
