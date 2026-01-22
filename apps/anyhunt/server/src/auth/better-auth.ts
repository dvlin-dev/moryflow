/**
 * [INPUT]: PrismaClient/OTP 发送器/secondaryStorage
 * [OUTPUT]: Better Auth 实例（Anyhunt Dev 专用配置）
 * [POS]: Auth 配置入口
 */
import { betterAuth, APIError, type SecondaryStorage } from 'better-auth';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { jwt } from 'better-auth/plugins/jwt';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createHash, randomBytes } from 'crypto';
import type { PrismaClient } from '../../generated/prisma-main/client';
import {
  SubscriptionTier,
  SubscriptionStatus,
} from '../../generated/prisma-main/client';
import { isDisposableEmail } from './email-validator';
import {
  API_KEY_PREFIX,
  API_KEY_LENGTH,
  KEY_PREFIX_DISPLAY_LENGTH,
} from '../api-key/api-key.constants';
import { REFRESH_TOKEN_TTL_SECONDS, isProduction } from './auth.constants';
import {
  getAuthBaseUrl,
  getJwtPluginOptions,
  getTrustedOrigins,
} from './auth.config';

// 套餐对应的月度配额
const TIER_MONTHLY_QUOTA = {
  FREE: 100,
  BASIC: 5000,
  PRO: 20000,
  TEAM: 60000,
} as const;

/**
 * 安全地计算一个月后的日期
 */
function addOneMonth(date: Date): Date {
  const result = new Date(date);
  const currentMonth = result.getMonth();
  result.setMonth(currentMonth + 1);

  if (result.getMonth() > (currentMonth + 1) % 12) {
    result.setDate(0);
  }

  return result;
}

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
      // 跨子域 Cookie 共享：anyhunt.app, console.anyhunt.app, admin.anyhunt.app
      // 仅在生产环境启用（本地开发使用单域）
      ...(isProduction && {
        crossSubDomainCookies: {
          enabled: true,
          domain: '.anyhunt.app',
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
      // 用户创建后初始化订阅和配额
      user: {
        create: {
          after: async (user) => {
            const now = new Date();
            const periodEnd = addOneMonth(now);

            try {
              await prisma.$transaction(async (tx) => {
                // 创建免费订阅
                await tx.subscription.create({
                  data: {
                    userId: user.id,
                    tier: SubscriptionTier.FREE,
                    status: SubscriptionStatus.ACTIVE,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                  },
                });

                // 创建配额
                await tx.quota.create({
                  data: {
                    userId: user.id,
                    monthlyLimit: TIER_MONTHLY_QUOTA.FREE,
                    monthlyUsed: 0,
                    periodStartAt: now,
                    periodEndAt: periodEnd,
                  },
                });

                // 创建默认 API Key
                const apiKeyBytes = randomBytes(API_KEY_LENGTH);
                const fullKey = `${API_KEY_PREFIX}${apiKeyBytes.toString('hex')}`;
                const keyHash = createHash('sha256')
                  .update(fullKey)
                  .digest('hex');
                const keyPrefix = fullKey.substring(
                  0,
                  KEY_PREFIX_DISPLAY_LENGTH,
                );

                await tx.apiKey.create({
                  data: {
                    userId: user.id,
                    name: 'Default',
                    keyPrefix,
                    keyHash,
                    isActive: true,
                  },
                });
              });
            } catch (error) {
              console.error(
                `[BetterAuth] Failed to initialize user resources for ${user.id}:`,
                error,
              );
              await prisma.user
                .delete({ where: { id: user.id } })
                .catch(() => undefined);
              throw new APIError('INTERNAL_SERVER_ERROR', {
                message: 'Failed to initialize user resources',
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
