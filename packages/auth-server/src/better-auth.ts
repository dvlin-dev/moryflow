/**
 * [INPUT]: IdentityPrismaClient, sendOTP 回调
 * [OUTPUT]: Better Auth 实例
 * [POS]: 通用 Better Auth 配置（跨子域 cookie、JWT 插件、email OTP）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { betterAuth, APIError } from 'better-auth';
import { jwt, emailOTP } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { PrismaClient } from '@aiget/identity-db';
import {
  COOKIE_DOMAIN,
  SESSION_TTL_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
  JWT_CONFIG,
  EMAIL_OTP_CONFIG,
  DEFAULT_TRUSTED_ORIGINS,
} from './constants';

/**
 * OTP 发送回调函数类型
 */
export type SendOTPFunction = (
  email: string,
  otp: string,
  type: 'sign-in' | 'email-verification' | 'forget-password'
) => Promise<void>;

/**
 * Better Auth 配置选项
 */
export interface CreateBetterAuthOptions {
  /**
   * Base URL（如 https://app.moryflow.com/api/v1/auth）
   */
  baseURL?: string;
  /**
   * 信任的来源列表（可选，默认使用 DEFAULT_TRUSTED_ORIGINS）
   */
  trustedOrigins?: string[];
  /**
   * Google OAuth 配置（可选）
   */
  google?: {
    clientId: string;
    clientSecret: string;
  };
  /**
   * Apple OAuth 配置（可选）
   */
  apple?: {
    clientId: string;
    clientSecret: string;
    appBundleIdentifier?: string;
    audience?: string | string[];
  };
}

/**
 * 创建可复用 Better Auth 实例
 *
 * 功能特性：
 * - 跨子域 Cookie（按业务线域名注入）
 * - Session TTL = 90 天
 * - Access JWT TTL = 6 小时
 * - Email OTP 验证码注册
 * - 支持第三方登录（Google/Apple）
 */
export function createBetterAuth(
  prisma: PrismaClient,
  sendOTP: SendOTPFunction,
  options: CreateBetterAuthOptions = {}
) {
  // 验证 BETTER_AUTH_SECRET
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be set and at least 32 characters long');
  }

  const trustedOrigins =
    options.trustedOrigins ??
    process.env.TRUSTED_ORIGINS?.split(',').filter(Boolean) ??
    DEFAULT_TRUSTED_ORIGINS;

  const baseURL =
    options.baseURL ?? process.env.BETTER_AUTH_URL ?? 'http://localhost:3000/api/auth';

  // 基础插件
  const plugins = [
    // JWT 插件：生成 Access Token
    jwt({
      jwt: {
        expirationTime: JWT_CONFIG.expirationTime,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
      },
    }),

    // Email OTP 插件
    emailOTP({
      otpLength: EMAIL_OTP_CONFIG.otpLength,
      expiresIn: EMAIL_OTP_CONFIG.expiresIn,
      allowedAttempts: EMAIL_OTP_CONFIG.allowedAttempts,
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        await sendOTP(email, otp, type);
      },
    }),
  ];

  // 第三方登录配置
  const socialProviders: Record<string, unknown> = {};
  const googleConfig =
    options.google ??
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }
      : undefined);

  if (googleConfig) {
    socialProviders.google = googleConfig;
  }

  const appleConfig =
    options.apple ??
    (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
      ? {
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
        }
      : undefined);

  if (appleConfig) {
    socialProviders.apple = appleConfig;
  }

  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    secret,
    baseURL,

    // 跨子域 Cookie 配置
    advanced: {
      ...(COOKIE_DOMAIN
        ? {
            crossSubDomainCookies: {
              enabled: true,
              domain: COOKIE_DOMAIN,
            },
          }
        : {}),
      // 允许无 Origin 的请求（移动端需要）
      disableCSRFCheck: process.env.NODE_ENV !== 'production',
    },

    // 信任的来源
    trustedOrigins,

    // Session 配置
    session: {
      expiresIn: SESSION_TTL_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },

    // Email + Password 认证
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },

    // 社交登录
    socialProviders: Object.keys(socialProviders).length > 0 ? socialProviders : undefined,

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

    plugins,
  });
}

/**
 * Better Auth 实例类型
 */
export type Auth = ReturnType<typeof createBetterAuth>;
