import { betterAuth, APIError } from 'better-auth';
import { bearer, emailOTP } from 'better-auth/plugins';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createHash, randomBytes } from 'crypto';
import type { PrismaClient } from '../../generated/prisma/client';
import { SubscriptionTier, SubscriptionStatus } from '../../generated/prisma/client';
import { isDisposableEmail } from './email-validator';
import {
  API_KEY_PREFIX,
  API_KEY_LENGTH,
  KEY_PREFIX_DISPLAY_LENGTH,
} from '../api-key/api-key.constants';

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
 * - OAuth 支持 (可扩展)
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
export function createBetterAuth(
  prisma: PrismaClient,
  sendOTP: (email: string, otp: string) => Promise<void>,
) {
  // 验证 BETTER_AUTH_SECRET
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'BETTER_AUTH_SECRET must be set and at least 32 characters long',
    );
  }

  const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',').filter(
    Boolean,
  ) ?? [
    // 默认信任的来源（生产环境应在环境变量中配置）
    'http://localhost:3000',
    'http://localhost:5173',
  ];

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
      disableCSRFCheck: true,
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
              // 创建免费订阅
              await prisma.subscription.create({
                data: {
                  userId: user.id,
                  tier: SubscriptionTier.FREE,
                  status: SubscriptionStatus.ACTIVE,
                  currentPeriodStart: now,
                  currentPeriodEnd: periodEnd,
                },
              });

              // 创建配额
              await prisma.quota.create({
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
              const keyHash = createHash('sha256').update(fullKey).digest('hex');
              const keyPrefix = fullKey.substring(0, KEY_PREFIX_DISPLAY_LENGTH);

              await prisma.apiKey.create({
                data: {
                  userId: user.id,
                  name: 'Default',
                  keyPrefix,
                  keyHash,
                  isActive: true,
                },
              });

              console.log(`[BetterAuth] Initialized subscription, quota and API key for user ${user.id}`);
            } catch (error) {
              // 如果已存在（幂等处理），忽略错误
              console.error(
                `[BetterAuth] Failed to initialize subscription/quota for user ${user.id}:`,
                error,
              );
            }
          },
        },
      },
    },
    plugins: [
      // Bearer Token 插件：允许通过 Authorization: Bearer <token> 进行认证
      // 适用于 OpenAI 兼容 API、移动应用、CLI 工具等非浏览器场景
      bearer(),
      // Email OTP 插件：邮箱验证码验证
      emailOTP({
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type === 'email-verification') {
            // 检查是否临时邮箱
            if (isDisposableEmail(email)) {
              throw new APIError('BAD_REQUEST', {
                message: 'This email is not supported.',
              });
            }
            // 注册时发送验证码
            await sendOTP(email, otp);
          }
        },
        sendVerificationOnSignUp: true,
        otpLength: 6,
        expiresIn: 300, // 5 分钟
        allowedAttempts: 3,
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createBetterAuth>;
