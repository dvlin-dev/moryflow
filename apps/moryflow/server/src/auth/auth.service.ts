/**
 * [INPUT]: ExpressRequest（Cookie/Headers）与 Auth 配置依赖
 * [OUTPUT]: Better Auth 实例与可验证的用户会话信息
 * [POS]: 认证核心服务，封装 Better Auth 实例与会话查询
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import { createBetterAuth, Auth } from './better-auth';
import type { CurrentUserDto } from '../types';
import { RedisService } from '../redis/redis.service';
import { isDisposableEmail } from './email-validator';
import { getBetterAuthRateLimitRule } from './auth.config';

export class ManagedAuthFlowError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ManagedAuthFlowError';
  }
}

const OTP_LOCK_TTL_SECONDS = 10;
const OTP_LOCK_REFRESH_INTERVAL_MS = 5_000;
const OTP_LOCK_RETRY_DELAY_MS = 50;
const OTP_LOCK_MAX_RETRIES = 40;

const toManagedAuthFlowError = (
  error: unknown,
  fallback: string,
): ManagedAuthFlowError => {
  if (error instanceof ManagedAuthFlowError) {
    return error;
  }

  return new ManagedAuthFlowError(fallback, 'SEND_FAILED', 500);
};

@Injectable()
export class AuthService implements OnModuleInit {
  private auth!: Auth;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.auth = createBetterAuth(
      this.prisma,
      this.emailService.sendOTP.bind(this.emailService),
      {
        get: (key) => this.redis.get(key),
        set: (key, value, ttl) => this.redis.set(key, value, ttl),
        delete: (key) => this.redis.del(key),
      },
    );
  }

  /**
   * 获取 Better Auth 实例
   */
  getAuth(): Auth {
    return this.auth;
  }

  /**
   * 从 Express Request 中获取 Session
   * 返回完整的用户信息（包括 tier 和 isAdmin）
   */
  async getSessionFromRequest(req: ExpressRequest): Promise<{
    session: { id: string; expiresAt: Date };
    user: CurrentUserDto;
  } | null> {
    const headers = new Headers();

    // 复制请求头
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      }
    }

    const session = await this.auth.api.getSession({ headers });

    if (!session) {
      return null;
    }

    // Better Auth 的 session.user 只包含基础字段
    // 需要从数据库获取完整的用户信息（包括订阅与 isAdmin）
    const fullUser = await this.prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        deletedAt: true,
        subscription: {
          select: { tier: true },
        },
      },
    });

    // 用户不存在或已被软删除
    if (!fullUser || fullUser.deletedAt) {
      return null;
    }

    return {
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        subscriptionTier: fullUser.subscription?.tier ?? 'free',
        isAdmin: fullUser.isAdmin,
      },
    };
  }

  assertEmailSignUpAllowed(email: string): void {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new ManagedAuthFlowError('Email is required', 'INVALID_EMAIL', 400);
    }
    if (isDisposableEmail(normalizedEmail)) {
      throw new ManagedAuthFlowError(
        'This email is not supported.',
        'BAD_REQUEST',
        400,
      );
    }
  }

  async assertManagedAuthRateLimit(
    pathname: string,
    tracker: string,
  ): Promise<void> {
    const rule = getBetterAuthRateLimitRule(pathname);
    if (!rule) {
      return;
    }

    const key = `auth:manual-rate-limit:${rule.path}:${tracker}`;
    const count = await this.redis.incrementWithExpire(key, rule.window);

    if (count > rule.max) {
      throw new ManagedAuthFlowError(
        'Too many requests. Please try again later.',
        'TOO_MANY_REQUESTS',
        429,
      );
    }
  }

  async sendEmailVerificationOTP(email: string): Promise<void> {
    await this.sendManagedEmailVerificationOTP(email);
  }

  private async sendManagedEmailVerificationOTP(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new ManagedAuthFlowError('Email is required', 'INVALID_EMAIL', 400);
    }
    if (isDisposableEmail(normalizedEmail)) {
      throw new ManagedAuthFlowError(
        'This email is not supported.',
        'BAD_REQUEST',
        400,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        emailVerified: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.emailVerified) {
      return;
    }

    await this.createAndDeliverOTP(normalizedEmail, 'email-verification');
  }

  async sendForgotPasswordOTP(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new ManagedAuthFlowError('Email is required', 'INVALID_EMAIL', 400);
    }
    if (isDisposableEmail(normalizedEmail)) {
      throw new ManagedAuthFlowError(
        'This email is not supported.',
        'BAD_REQUEST',
        400,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      return;
    }

    await this.createAndDeliverOTP(normalizedEmail, 'forget-password');
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async createAndDeliverOTP(
    email: string,
    type: 'email-verification' | 'forget-password',
  ): Promise<void> {
    await this.withOtpDeliveryLock(email, type, async (identifier) => {
      let otp: string;
      try {
        otp = await this.auth.api.createVerificationOTP({
          body: {
            email,
            type,
          },
        });
      } catch (error) {
        throw toManagedAuthFlowError(
          error,
          type === 'forget-password'
            ? 'Failed to send reset code'
            : 'Failed to send verification code',
        );
      }

      const latestVerification = await this.prisma.verification.findFirst({
        where: { identifier },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (!latestVerification) {
        throw new ManagedAuthFlowError(
          type === 'forget-password'
            ? 'Failed to send reset code'
            : 'Failed to send verification code',
          'SEND_FAILED',
          500,
        );
      }

      try {
        await this.emailService.sendOTP(email, otp);
      } catch (error) {
        await this.prisma.verification.deleteMany({
          where: { id: latestVerification.id },
        });
        throw toManagedAuthFlowError(
          error,
          type === 'forget-password'
            ? 'Failed to send reset code'
            : 'Failed to send verification code',
        );
      }

      try {
        await this.prisma.verification.deleteMany({
          where: {
            identifier,
            id: { not: latestVerification.id },
          },
        });
      } catch (error) {
        console.error('[AuthService] failed to cleanup stale OTP rows:', error);
      }
    });
  }

  private async withOtpDeliveryLock<T>(
    email: string,
    type: 'email-verification' | 'forget-password',
    task: (identifier: string) => Promise<T>,
  ): Promise<T> {
    const identifier = `${type}-otp-${email}`;
    const lockKey = `auth:otp-lock:${identifier}`;
    const lockToken = `${Date.now()}:${Math.random().toString(36).slice(2)}`;

    let acquired = false;
    for (let attempt = 0; attempt < OTP_LOCK_MAX_RETRIES; attempt += 1) {
      acquired = await this.redis.setnx(
        lockKey,
        lockToken,
        OTP_LOCK_TTL_SECONDS,
      );
      if (acquired) {
        break;
      }
      await this.sleep(OTP_LOCK_RETRY_DELAY_MS);
    }

    if (!acquired) {
      throw new ManagedAuthFlowError(
        type === 'forget-password'
          ? 'Another reset request is already in progress.'
          : 'Another verification request is already in progress.',
        'OTP_IN_PROGRESS',
        409,
      );
    }

    let refreshTimer: ReturnType<typeof setInterval> | null = null;
    try {
      refreshTimer = setInterval(() => {
        void this.refreshOtpDeliveryLock(lockKey, lockToken).catch((error) => {
          console.error(
            '[AuthService] failed to refresh OTP delivery lock:',
            error,
          );
        });
      }, OTP_LOCK_REFRESH_INTERVAL_MS);
      return await task(identifier);
    } finally {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      await this.redis.compareAndDelete(lockKey, lockToken);
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async refreshOtpDeliveryLock(
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    await this.redis.compareAndExpire(lockKey, lockToken, OTP_LOCK_TTL_SECONDS);
  }
}
