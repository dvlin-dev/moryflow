import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { PrismaService } from '../prisma';
import { EmailService } from '../email';
import { RedisService } from '../redis/redis.service';
import { isDisposableEmail } from './email-validator';
import { AUTH_PASSWORD_MIN_LENGTH } from './auth.constants';
import { getBetterAuthRateLimitRule } from './auth.config';
import { ManagedAuthFlowError } from './auth.service';
import { AuthProvisioningService } from './auth-provisioning.service';

const SIGNUP_OTP_TTL_MS = 5 * 60 * 1000;
const SIGNUP_OTP_ALLOWED_ATTEMPTS = 3;
const SIGNUP_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const SIGNUP_TOKEN_TTL_MS = 10 * 60 * 1000;

const hashValue = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const buildOTP = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

const buildSignupToken = (): string => randomBytes(32).toString('base64url');

const buildDefaultName = (email: string): string => {
  const prefix = email
    .split('@')[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);

  const safePrefix = prefix && prefix.length > 0 ? prefix : 'user';
  return `${safePrefix}${String(randomInt(0, 1000)).padStart(3, '0')}`;
};

@Injectable()
export class AuthSignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly redis: RedisService,
    private readonly authProvisioningService: AuthProvisioningService,
  ) {}

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

  async startEmailSignUp(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    this.assertEmailAllowed(normalizedEmail);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new ManagedAuthFlowError(
        'An account with this email already exists.',
        'ACCOUNT_ALREADY_EXISTS',
        409,
      );
    }

    const existingPending = await this.prisma.pendingEmailSignup.findUnique({
      where: { email: normalizedEmail },
    });

    if (
      existingPending?.lastOtpSentAt &&
      Date.now() - existingPending.lastOtpSentAt.getTime() <
        SIGNUP_OTP_RESEND_COOLDOWN_MS
    ) {
      throw new ManagedAuthFlowError(
        'Please wait before requesting another verification code.',
        'OTP_IN_PROGRESS',
        409,
      );
    }

    const otp = buildOTP();
    const now = new Date();
    await this.prisma.pendingEmailSignup.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        otpHash: hashValue(otp),
        otpExpiresAt: new Date(now.getTime() + SIGNUP_OTP_TTL_MS),
        otpAttemptCount: 0,
        lastOtpSentAt: now,
      },
      update: {
        otpHash: hashValue(otp),
        otpExpiresAt: new Date(now.getTime() + SIGNUP_OTP_TTL_MS),
        otpAttemptCount: 0,
        lastOtpSentAt: now,
        verifiedAt: null,
        completionTokenHash: null,
        completionTokenExpiresAt: null,
      },
    });

    try {
      await this.emailService.sendOTP(normalizedEmail, otp);
    } catch {
      if (existingPending) {
        await this.prisma.pendingEmailSignup.update({
          where: { email: normalizedEmail },
          data: {
            otpHash: existingPending.otpHash,
            otpExpiresAt: existingPending.otpExpiresAt,
            otpAttemptCount: existingPending.otpAttemptCount,
            lastOtpSentAt: existingPending.lastOtpSentAt,
            verifiedAt: existingPending.verifiedAt,
            completionTokenHash: existingPending.completionTokenHash,
            completionTokenExpiresAt: existingPending.completionTokenExpiresAt,
          },
        });
      } else {
        await this.prisma.pendingEmailSignup.delete({
          where: { email: normalizedEmail },
        });
      }
      throw new ManagedAuthFlowError(
        'Failed to send verification code',
        'SEND_FAILED',
        500,
      );
    }
  }

  async verifyEmailSignUpOTP(
    email: string,
    otp: string,
  ): Promise<{ signupToken: string; signupTokenExpiresAt: string }> {
    const normalizedEmail = this.normalizeEmail(email);
    const normalizedOTP = otp.trim();
    const normalizedOTPHash = hashValue(normalizedOTP);
    const pending = await this.prisma.pendingEmailSignup.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      throw new ManagedAuthFlowError(
        'Verification code is invalid.',
        'INVALID_OTP',
        400,
      );
    }

    if (pending.otpExpiresAt.getTime() <= Date.now()) {
      throw new ManagedAuthFlowError(
        'Verification code has expired.',
        'OTP_EXPIRED',
        400,
      );
    }

    if (pending.otpAttemptCount >= SIGNUP_OTP_ALLOWED_ATTEMPTS) {
      throw new ManagedAuthFlowError(
        'Too many incorrect verification attempts.',
        'OTP_ATTEMPTS_EXCEEDED',
        400,
      );
    }

    if (pending.otpHash !== normalizedOTPHash) {
      await this.prisma.pendingEmailSignup.update({
        where: { email: normalizedEmail },
        data: { otpAttemptCount: pending.otpAttemptCount + 1 },
      });
      throw new ManagedAuthFlowError(
        'Verification code is invalid.',
        'INVALID_OTP',
        400,
      );
    }

    const signupToken = buildSignupToken();
    const signupTokenExpiresAt = new Date(Date.now() + SIGNUP_TOKEN_TTL_MS);

    const updateResult = await this.prisma.pendingEmailSignup.updateMany({
      where: {
        email: normalizedEmail,
        otpHash: normalizedOTPHash,
        otpExpiresAt: pending.otpExpiresAt,
        otpAttemptCount: pending.otpAttemptCount,
      },
      data: {
        verifiedAt: new Date(),
        completionTokenHash: hashValue(signupToken),
        completionTokenExpiresAt: signupTokenExpiresAt,
      },
    });

    if (updateResult.count !== 1) {
      throw new ManagedAuthFlowError(
        'Verification code is invalid.',
        'INVALID_OTP',
        400,
      );
    }

    return {
      signupToken,
      signupTokenExpiresAt: signupTokenExpiresAt.toISOString(),
    };
  }

  async completeEmailSignUp(
    signupToken: string,
    password: string,
  ): Promise<{
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
      name: string;
    };
  }> {
    const normalizedToken = signupToken.trim();
    if (!normalizedToken) {
      throw new ManagedAuthFlowError(
        'Signup token is required.',
        'INVALID_SIGNUP_TOKEN',
        400,
      );
    }
    if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
      throw new ManagedAuthFlowError(
        'Password must be at least 8 characters.',
        'INVALID_PASSWORD',
        400,
      );
    }

    const pending = await this.prisma.pendingEmailSignup.findFirst({
      where: { completionTokenHash: hashValue(normalizedToken) },
    });

    if (
      !pending ||
      !pending.verifiedAt ||
      !pending.completionTokenExpiresAt ||
      pending.completionTokenExpiresAt.getTime() <= Date.now()
    ) {
      throw new ManagedAuthFlowError(
        'Signup token is invalid or has expired.',
        'INVALID_SIGNUP_TOKEN',
        400,
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: pending.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ManagedAuthFlowError(
        'An account with this email already exists.',
        'ACCOUNT_ALREADY_EXISTS',
        409,
      );
    }

    const hashedPassword = await hashPassword(password);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const transactionPending = await tx.pendingEmailSignup.findFirst({
          where: { completionTokenHash: hashValue(normalizedToken) },
        });

        if (
          !transactionPending ||
          !transactionPending.verifiedAt ||
          !transactionPending.completionTokenExpiresAt ||
          transactionPending.completionTokenExpiresAt.getTime() <= Date.now()
        ) {
          throw new ManagedAuthFlowError(
            'Signup token is invalid or has expired.',
            'INVALID_SIGNUP_TOKEN',
            400,
          );
        }

        const transactionExistingUser = await tx.user.findUnique({
          where: { email: transactionPending.email },
          select: { id: true },
        });
        if (transactionExistingUser) {
          throw new ManagedAuthFlowError(
            'An account with this email already exists.',
            'ACCOUNT_ALREADY_EXISTS',
            409,
          );
        }

        await tx.pendingEmailSignup.delete({
          where: { email: transactionPending.email },
        });

        const createdUser = await tx.user.create({
          data: {
            email: transactionPending.email,
            emailVerified: true,
            name: buildDefaultName(transactionPending.email),
          },
          select: {
            id: true,
            email: true,
            emailVerified: true,
            name: true,
          },
        });

        await tx.account.create({
          data: {
            userId: createdUser.id,
            accountId: createdUser.email,
            providerId: 'credential',
            password: hashedPassword,
          },
        });

        await this.authProvisioningService.provisionUser(
          createdUser.id,
          createdUser.email,
          tx,
        );

        return createdUser;
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.name ?? buildDefaultName(user.email),
        },
      };
    } catch (error) {
      if (error instanceof ManagedAuthFlowError) {
        throw error;
      }
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new ManagedAuthFlowError(
          'An account with this email already exists.',
          'ACCOUNT_ALREADY_EXISTS',
          409,
        );
      }
      if (prismaError.code === 'P2025') {
        throw new ManagedAuthFlowError(
          'Signup token is invalid or has expired.',
          'INVALID_SIGNUP_TOKEN',
          400,
        );
      }
      throw error;
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertEmailAllowed(email: string): void {
    if (!email) {
      throw new ManagedAuthFlowError('Email is required', 'INVALID_EMAIL', 400);
    }
    if (isDisposableEmail(email)) {
      throw new ManagedAuthFlowError(
        'This email is not supported.',
        'BAD_REQUEST',
        400,
      );
    }
  }
}
