/**
 * [INPUT]: ExpressRequest（Cookie/Headers）与 Auth 配置依赖
 * [OUTPUT]: Better Auth 实例与可验证的用户会话信息
 * [POS]: 认证核心服务，封装 Better Auth 实例与会话查询
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { hashPassword } from 'better-auth/crypto';
import type { Request as ExpressRequest } from 'express';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import { createBetterAuth, Auth } from './better-auth';
import type { CurrentUserDto } from '../types';
import { RedisService } from '../redis/redis.service';
import { isDisposableEmail } from './email-validator';
import { AUTH_PASSWORD_MIN_LENGTH } from './auth.constants';
import { getBetterAuthRateLimitRule } from './auth.config';

type SignUpRecoveryUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type RecoverUnverifiedSignUpInput = {
  email: string;
  password?: string;
  name?: string;
};

type PendingSignUpRecovery = {
  password: string;
  name: string | null;
};

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

const PENDING_SIGN_UP_RECOVERY_TTL_SECONDS = 15 * 60;
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

  async recoverUnverifiedSignUp(input: RecoverUnverifiedSignUpInput): Promise<{
    token: null;
    user: SignUpRecoveryUser;
  } | null> {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }
    if (
      typeof input.password !== 'string' ||
      input.password.length < AUTH_PASSWORD_MIN_LENGTH
    ) {
      return null;
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        accounts: {
          select: { id: true, providerId: true },
        },
      },
    });

    const credentialAccount = existingUser?.accounts.find(
      (account: { id: string; providerId: string }) =>
        account.providerId === 'credential',
    );

    if (
      !existingUser ||
      existingUser.deletedAt ||
      existingUser.emailVerified ||
      !credentialAccount
    ) {
      return null;
    }

    await this.storePendingSignUpRecovery({
      email: normalizedEmail,
      password: input.password,
      name: this.normalizeRecoveryName(input.name),
    });

    return {
      token: null,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name:
          existingUser.name || normalizedEmail.split('@')[0] || normalizedEmail,
        image: existingUser.image,
        emailVerified: existingUser.emailVerified,
        createdAt: existingUser.createdAt,
        updatedAt: existingUser.updatedAt,
      },
    };
  }

  async assertEmailSignUpAllowed(email: string): Promise<void> {
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
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, rule.window);
    }

    if (count > rule.max) {
      throw new ManagedAuthFlowError(
        'Too many requests. Please try again later.',
        'TOO_MANY_REQUESTS',
        429,
      );
    }
  }

  async sendEmailVerificationOTP(email: string): Promise<void> {
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

  async consumePendingSignUpRecovery(input: {
    userId: string;
    email: string;
  }): Promise<{ name: string | null } | null> {
    const normalizedEmail = this.normalizeEmail(input.email);
    const pending = await this.readPendingSignUpRecovery(normalizedEmail);
    if (!pending) {
      return null;
    }

    const credentialAccount = await this.prisma.account.findFirst({
      where: {
        userId: input.userId,
        providerId: 'credential',
      },
      select: { id: true },
    });

    if (!credentialAccount) {
      return null;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: credentialAccount.id },
        data: { password: pending.password },
      });
      await tx.user.update({
        where: { id: input.userId },
        data: { name: pending.name },
      });
    });

    await this.deletePendingSignUpRecovery(normalizedEmail);
    return { name: pending.name };
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

  private async storePendingSignUpRecovery(input: {
    email: string;
    password: string;
    name: string | null;
  }): Promise<void> {
    const passwordHash = await hashPassword(input.password);
    await this.redis.set(
      this.pendingSignUpRecoveryKey(input.email),
      JSON.stringify({
        password: passwordHash,
        name: input.name,
      } satisfies PendingSignUpRecovery),
      PENDING_SIGN_UP_RECOVERY_TTL_SECONDS,
    );
  }

  private async readPendingSignUpRecovery(
    email: string,
  ): Promise<PendingSignUpRecovery | null> {
    const raw = await this.redis.get(this.pendingSignUpRecoveryKey(email));
    if (!raw) {
      return null;
    }

    try {
      const payload = JSON.parse(raw) as Partial<PendingSignUpRecovery>;
      if (typeof payload.password !== 'string') {
        return null;
      }
      if (payload.name !== null && typeof payload.name !== 'string') {
        return null;
      }
      return {
        password: payload.password,
        name: payload.name,
      };
    } catch {
      return null;
    }
  }

  private async deletePendingSignUpRecovery(email: string): Promise<void> {
    await this.redis.del(this.pendingSignUpRecoveryKey(email));
  }

  private pendingSignUpRecoveryKey(email: string): string {
    return `auth:pending-sign-up-recovery:${email}`;
  }

  private normalizeRecoveryName(name: string | undefined): string | null {
    if (typeof name !== 'string') {
      return null;
    }

    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed : null;
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
        void this.refreshOtpDeliveryLock(lockKey, lockToken);
      }, OTP_LOCK_REFRESH_INTERVAL_MS);
      return await task(identifier);
    } finally {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      const currentToken = await this.redis.get(lockKey);
      if (currentToken === lockToken) {
        await this.redis.del(lockKey);
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async refreshOtpDeliveryLock(
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    const currentToken = await this.redis.get(lockKey);
    if (currentToken === lockToken) {
      await this.redis.expire(lockKey, OTP_LOCK_TTL_SECONDS);
    }
  }
}
