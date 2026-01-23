/**
 * [INPUT]: PrismaClient/OTP 发送器/secondaryStorage
 * [OUTPUT]: Better Auth 实例（Moryflow 专用配置）
 * [POS]: Auth 配置入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { betterAuth, APIError, type SecondaryStorage } from 'better-auth';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { jwt } from 'better-auth/plugins/jwt';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '../../generated/prisma/client';
import { isDisposableEmail } from './email-validator';
import { REFRESH_TOKEN_TTL_SECONDS, isProduction } from './auth.constants';
import {
  getAuthBaseUrl,
  getJwtPluginOptions,
  getTrustedOrigins,
} from './auth.config';

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
 * - Web 端：refreshToken Cookie + accessToken（JWT）
 * - API/Mobile：refreshToken（Secure Storage）+ accessToken（JWT）
 */
export function createBetterAuth(
  prisma: PrismaClient,
  sendOTP: (email: string, otp: string) => Promise<void>,
  secondaryStorage?: SecondaryStorage,
) {
  // 验证 BETTER_AUTH_SECRET
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'BETTER_AUTH_SECRET must be set and at least 32 characters long',
    );
  }

  const baseURL = getAuthBaseUrl();
  const trustedOrigins = getTrustedOrigins();
  const jwtOptions = getJwtPluginOptions(baseURL);

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    secondaryStorage,
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    session: {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      updateAge: 60 * 60 * 24,
      storeSessionInDatabase: false,
      cookieCache: {
        enabled: true,
        strategy: 'jwe',
        maxAge: REFRESH_TOKEN_TTL_SECONDS,
      },
    },
    trustedOrigins,
    advanced: {
      useSecureCookies: isProduction,
      // 跨子域 Cookie 共享：moryflow.com / app.moryflow.com
      ...(isProduction && {
        crossSubDomainCookies: {
          enabled: true,
          domain: '.moryflow.com',
        },
      }),
    },
    rateLimit: {
      enabled: true,
      window: 10,
      max: 20,
      storage: secondaryStorage ? 'secondary-storage' : 'memory',
    },
    // 数据库钩子
    databaseHooks: {
      // 防止已删除用户创建新 session
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
      // 用户创建后初始化订阅
      user: {
        create: {
          after: async (user) => {
            const now = new Date();
            const periodEnd = new Date(
              Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth() + 1,
                now.getUTCDate(),
              ),
            );

            try {
              await prisma.subscription.create({
                data: {
                  userId: user.id,
                  tier: 'free',
                  status: 'active',
                  currentPeriodStart: now,
                  currentPeriodEnd: periodEnd,
                },
              });

              const adminEmails = (process.env.ADMIN_EMAILS ?? '')
                .split(',')
                .map((email) => email.trim().toLowerCase())
                .filter(Boolean);

              if (adminEmails.includes(user.email.toLowerCase())) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { isAdmin: true },
                });
              }
            } catch (error) {
              console.error(
                `[BetterAuth] Failed to initialize subscription for ${user.id}:`,
                error,
              );
              await prisma.user
                .delete({ where: { id: user.id } })
                .catch(() => undefined);
              throw new APIError('INTERNAL_SERVER_ERROR', {
                message: 'Failed to initialize subscription',
              });
            }
          },
        },
      },
    },
    plugins: [
      jwt(jwtOptions),
      // Email OTP 插件：邮箱验证码验证
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          // 检查是否临时邮箱（注册和密码重置都检查）
          if (isDisposableEmail(email)) {
            throw new APIError('BAD_REQUEST', {
              message: 'This email is not supported.',
            });
          }

          // 注册验证和密码重置都发送 OTP
          if (type === 'email-verification' || type === 'forget-password') {
            await sendOTP(email, otp);
          }
        },
        sendVerificationOnSignUp: true,
        otpLength: 6,
        expiresIn: 300, // 5 分钟
        allowedAttempts: 3,
        overrideDefaultEmailVerification: true, // 使用 OTP 替代验证链接
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createBetterAuth>;
