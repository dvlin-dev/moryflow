import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { AuthSignupService } from './auth-signup.service';
import type { PrismaService } from '../prisma';
import type { EmailService } from '../email';
import type { RedisService } from '../redis/redis.service';
import type { AuthProvisioningService } from './auth-provisioning.service';

describe('AuthSignupService', () => {
  let service: AuthSignupService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    account: {
      create: ReturnType<typeof vi.fn>;
    };
    pendingEmailSignup: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockEmailService: {
    sendOTP: ReturnType<typeof vi.fn>;
  };
  let mockRedisService: {
    incrementWithExpire: ReturnType<typeof vi.fn>;
  };
  let mockProvisioningService: {
    provisionUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      account: {
        create: vi.fn(),
      },
      pendingEmailSignup: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((callback: (tx: typeof mockPrisma) => unknown) =>
        Promise.resolve(callback(mockPrisma)),
      ),
    };

    mockEmailService = {
      sendOTP: vi.fn(),
    };

    mockRedisService = {
      incrementWithExpire: vi.fn().mockResolvedValue(1),
    };

    mockProvisioningService = {
      provisionUser: vi.fn().mockResolvedValue(undefined),
    };

    service = new AuthSignupService(
      mockPrisma as unknown as PrismaService,
      mockEmailService as unknown as EmailService,
      mockRedisService as unknown as RedisService,
      mockProvisioningService as unknown as AuthProvisioningService,
    );
  });

  it('should create a pending signup and send otp without creating user records', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await service.startEmailSignUp('demo@example.com');

    expect(mockPrisma.pendingEmailSignup.upsert).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendOTP).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.account.create).not.toHaveBeenCalled();
  });

  it('should reject start when the email already belongs to a real account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'demo@example.com',
      deletedAt: null,
    });

    await expect(
      service.startEmailSignUp('demo@example.com'),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('should preserve an existing pending signup when resend delivery fails', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.pendingEmailSignup.findUnique.mockResolvedValue({
      email: 'demo@example.com',
      lastOtpSentAt: new Date(Date.now() - 61_000),
    });
    mockEmailService.sendOTP.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.startEmailSignUp('demo@example.com'),
    ).rejects.toMatchObject({
      code: 'SEND_FAILED',
      status: 500,
    });

    expect(mockPrisma.pendingEmailSignup.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.pendingEmailSignup.deleteMany).not.toHaveBeenCalled();
  });

  it('should only roll back a failed resend when the row still matches this attempt', async () => {
    const existingPending = {
      email: 'demo@example.com',
      otpHash: 'old-hash',
      otpExpiresAt: new Date(Date.now() + 30_000),
      otpAttemptCount: 1,
      lastOtpSentAt: new Date(Date.now() - 61_000),
      verifiedAt: new Date(Date.now() - 120_000),
      completionTokenHash: 'old-token',
      completionTokenExpiresAt: new Date(Date.now() + 120_000),
    };
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.pendingEmailSignup.findUnique.mockResolvedValue(existingPending);
    mockEmailService.sendOTP.mockRejectedValue(new Error('smtp down'));

    await expect(
      service.startEmailSignUp('demo@example.com'),
    ).rejects.toMatchObject({
      code: 'SEND_FAILED',
      status: 500,
    });

    expect(mockPrisma.pendingEmailSignup.updateMany).toHaveBeenCalledWith({
      where: {
        email: 'demo@example.com',
        otpHash: expect.any(String),
        otpExpiresAt: expect.any(Date),
        otpAttemptCount: 0,
        lastOtpSentAt: expect.any(Date),
        verifiedAt: null,
        completionTokenHash: null,
        completionTokenExpiresAt: null,
      },
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
  });

  it('should reject wrong otp and increment attempts', async () => {
    mockPrisma.pendingEmailSignup.findUnique.mockResolvedValue({
      email: 'demo@example.com',
      otpHash: createHash('sha256').update('654321').digest('hex'),
      otpExpiresAt: new Date(Date.now() + 60_000),
      otpAttemptCount: 0,
      verifiedAt: null,
      completionTokenHash: null,
      completionTokenExpiresAt: null,
    });

    await expect(
      service.verifyEmailSignUpOTP('demo@example.com', '123456'),
    ).rejects.toMatchObject({
      code: 'INVALID_OTP',
      status: 400,
    });

    expect(mockPrisma.pendingEmailSignup.updateMany).toHaveBeenCalledWith({
      where: {
        email: 'demo@example.com',
        otpHash: createHash('sha256').update('654321').digest('hex'),
        otpExpiresAt: expect.any(Date),
        otpAttemptCount: {
          lt: 3,
        },
      },
      data: {
        otpAttemptCount: {
          increment: 1,
        },
      },
    });
  });

  it('should issue a signup token after a valid otp without creating user records', async () => {
    mockPrisma.pendingEmailSignup.findUnique.mockResolvedValue({
      email: 'demo@example.com',
      otpHash: createHash('sha256').update('123456').digest('hex'),
      otpExpiresAt: new Date(Date.now() + 60_000),
      otpAttemptCount: 0,
      verifiedAt: null,
      completionTokenHash: null,
      completionTokenExpiresAt: null,
    });
    mockPrisma.pendingEmailSignup.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.verifyEmailSignUpOTP(
      'demo@example.com',
      '123456',
    );

    expect(result.signupToken).toEqual(expect.any(String));
    expect(result.signupTokenExpiresAt).toEqual(expect.any(String));
    expect(mockPrisma.pendingEmailSignup.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.account.create).not.toHaveBeenCalled();
  });

  it('should reject an otp that was rotated away before verification completed', async () => {
    mockPrisma.pendingEmailSignup.findUnique.mockResolvedValue({
      email: 'demo@example.com',
      otpHash: createHash('sha256').update('123456').digest('hex'),
      otpExpiresAt: new Date(Date.now() + 60_000),
      otpAttemptCount: 0,
      verifiedAt: null,
      completionTokenHash: null,
      completionTokenExpiresAt: null,
    });
    mockPrisma.pendingEmailSignup.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.verifyEmailSignUpOTP('demo@example.com', '123456'),
    ).rejects.toMatchObject({
      code: 'INVALID_OTP',
      status: 400,
    });
  });

  it('should create the verified user and credential account during completion', async () => {
    mockPrisma.pendingEmailSignup.findFirst.mockResolvedValue({
      email: 'demo@example.com',
      verifiedAt: new Date(),
      completionTokenHash: createHash('sha256')
        .update('signup-token')
        .digest('hex'),
      completionTokenExpiresAt: new Date(Date.now() + 60_000),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user_signup_1',
      email: 'demo@example.com',
      emailVerified: true,
      name: 'demo123',
    });

    const result = await service.completeEmailSignUp(
      'signup-token',
      'secret-123',
    );

    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.account.create).toHaveBeenCalledTimes(1);
    expect(mockProvisioningService.provisionUser).toHaveBeenCalledWith(
      'user_signup_1',
      'demo@example.com',
      expect.any(Object),
    );
    expect(mockPrisma.pendingEmailSignup.delete).toHaveBeenCalledWith({
      where: { email: 'demo@example.com' },
    });
    expect(result).toEqual({
      user: {
        id: 'user_signup_1',
        email: 'demo@example.com',
        emailVerified: true,
        name: 'demo123',
      },
    });
  });

  it('should return a stable account exists error when completion races with another request', async () => {
    mockPrisma.pendingEmailSignup.findFirst.mockResolvedValue({
      email: 'demo@example.com',
      verifiedAt: new Date(),
      completionTokenHash: createHash('sha256')
        .update('signup-token')
        .digest('hex'),
      completionTokenExpiresAt: new Date(Date.now() + 60_000),
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.completeEmailSignUp('signup-token', 'secret-123'),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_ALREADY_EXISTS',
      status: 409,
    });
  });
});
