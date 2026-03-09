/**
 * AuthService 单元测试
 * 测试认证核心服务
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma';
import type { EmailService } from '../email';
import type { RedisService } from '../redis/redis.service';

describe('AuthService', () => {
  const buildCredential = (label: string) => ['auth', label, '2026'].join('-');
  type MockFn<T extends (...args: any[]) => any> = ReturnType<typeof vi.fn<T>>;
  type MockTransactionInput =
    | Array<Promise<unknown>>
    | ((prisma: {
        user: {
          findUnique: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
        account: {
          findFirst: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
        verification: {
          deleteMany: ReturnType<typeof vi.fn>;
          findFirst: ReturnType<typeof vi.fn>;
        };
        $transaction: ReturnType<typeof vi.fn>;
      }) => unknown);

  let service: AuthService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    account: {
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    verification: {
      deleteMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let mockEmailService: {
    sendOTP: MockFn<(input: unknown) => Promise<void>>;
  };
  let mockRedisService: {
    get: MockFn<(key: string) => Promise<string | null>>;
    set: MockFn<(key: string, value: string) => Promise<void>>;
    del: MockFn<(key: string) => Promise<void>>;
    incr: MockFn<(key: string) => Promise<number>>;
    expire: MockFn<(key: string, seconds: number) => Promise<void>>;
    compareAndDelete: MockFn<
      (key: string, expectedValue: string) => Promise<boolean>
    >;
    compareAndExpire: MockFn<
      (
        key: string,
        expectedValue: string,
        ttlSeconds: number,
      ) => Promise<boolean>
    >;
    setnx: MockFn<
      (key: string, value: string, ttlSeconds?: number) => Promise<boolean>
    >;
  };
  type GetSessionInput = { headers: Headers };
  type GetSessionFn = (input: GetSessionInput) => Promise<unknown>;
  let mockAuth: {
    api: {
      getSession: MockFn<GetSessionFn>;
      sendVerificationOTP: MockFn<(input: unknown) => Promise<void>>;
      createVerificationOTP: MockFn<(input: unknown) => Promise<void>>;
    };
  };

  beforeEach(() => {
    const redisState = new Map<string, string>();

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      account: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      verification: {
        deleteMany: vi.fn(),
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((input: MockTransactionInput) => {
        if (typeof input === 'function') {
          return Promise.resolve(input(mockPrisma));
        }

        return Promise.all(input);
      }),
    };

    mockEmailService = {
      sendOTP: vi.fn(),
    };

    mockRedisService = {
      get: vi.fn(async (key: string) => redisState.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => {
        redisState.set(key, value);
      }),
      del: vi.fn(async (key: string) => {
        redisState.delete(key);
      }),
      incr: vi.fn(async (key: string) => {
        const nextValue = Number.parseInt(redisState.get(key) ?? '0', 10) + 1;
        redisState.set(key, String(nextValue));
        return nextValue;
      }),
      expire: vi.fn(async () => undefined),
      compareAndDelete: vi.fn(async (key: string, expectedValue: string) => {
        if (redisState.get(key) !== expectedValue) {
          return false;
        }
        redisState.delete(key);
        return true;
      }),
      compareAndExpire: vi.fn(
        async (key: string, expectedValue: string, _ttlSeconds: number) => {
          return redisState.get(key) === expectedValue;
        },
      ),
      setnx: vi.fn(async (key: string, value: string) => {
        if (redisState.has(key)) {
          return false;
        }
        redisState.set(key, value);
        return true;
      }),
    };

    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockEmailService as unknown as EmailService,
      mockRedisService as unknown as RedisService,
    );

    const getSession = vi.fn<GetSessionFn>();
    mockAuth = {
      api: {
        getSession,
        sendVerificationOTP: vi.fn(),
        createVerificationOTP: vi.fn(),
      },
    };

    (service as unknown as { auth: typeof mockAuth }).auth = mockAuth;
  });

  describe('getAuth', () => {
    it('should return the auth instance', () => {
      const auth = service.getAuth();
      expect(auth).toBe(mockAuth);
    });
  });

  describe('getSessionFromRequest', () => {
    const mockRequest = {
      headers: {
        cookie: 'session=abc123',
        authorization: 'Bearer token123',
      },
    } as unknown as ExpressRequest;

    it('should return null when no session exists', async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const result = await service.getSessionFromRequest(mockRequest);

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user_1' },
        session: { id: 'session_1', expiresAt: new Date() },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getSessionFromRequest(mockRequest);

      expect(result).toBeNull();
    });

    it('should return null for soft-deleted user', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user_1' },
        session: { id: 'session_1', expiresAt: new Date() },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
        deletedAt: new Date(),
        subscription: { tier: 'pro' },
      });

      const result = await service.getSessionFromRequest(mockRequest);

      expect(result).toBeNull();
    });

    it('should return session with full user data', async () => {
      const expiresAt = new Date('2024-02-01');
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user_1' },
        session: { id: 'session_1', expiresAt },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
        deletedAt: null,
        subscription: { tier: 'pro' },
      });

      const result = await service.getSessionFromRequest(mockRequest);

      expect(result).toEqual({
        session: {
          id: 'session_1',
          expiresAt,
        },
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          subscriptionTier: 'pro',
          isAdmin: false,
        },
      });
    });

    it('should default tier to free when no subscription', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user_1' },
        session: { id: 'session_1', expiresAt: new Date() },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        isAdmin: false,
        deletedAt: null,
        subscription: null,
      });

      const result = await service.getSessionFromRequest(mockRequest);

      expect(result?.user.subscriptionTier).toBe('free');
    });

    it('should handle admin users', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'admin_1' },
        session: { id: 'session_1', expiresAt: new Date() },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin_1',
        email: 'admin@example.com',
        name: 'Admin User',
        isAdmin: true,
        deletedAt: null,
        subscription: { tier: 'pro' },
      });

      const result = await service.getSessionFromRequest(mockRequest);

      expect(result?.user.isAdmin).toBe(true);
    });

    it('should copy headers correctly', async () => {
      const requestWithArrayHeader = {
        headers: {
          cookie: 'session=abc',
          'accept-language': ['en-US', 'en'],
        },
      } as unknown as ExpressRequest;

      mockAuth.api.getSession.mockResolvedValue(null);

      await service.getSessionFromRequest(requestWithArrayHeader);

      expect(mockAuth.api.getSession).toHaveBeenCalled();
      const calls = mockAuth.api.getSession.mock.calls as Array<
        [GetSessionInput]
      >;
      const call = calls[0]?.[0];
      expect(call?.headers).toBeInstanceOf(Headers);
    });
  });

  describe('recoverUnverifiedSignUp', () => {
    it('should return existing unverified credential user without triggering server-side otp send', async () => {
      const createdAt = new Date('2026-03-08T00:00:00.000Z');
      const updatedAt = new Date('2026-03-08T01:00:00.000Z');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_recover_1',
        email: 'recover@example.com',
        name: 'Recover User',
        image: null,
        emailVerified: false,
        createdAt,
        updatedAt,
        deletedAt: null,
        accounts: [{ id: 'account_1', providerId: 'credential' }],
      });

      const result = await service.recoverUnverifiedSignUp({
        email: ' Recover@Example.com ',
        password: buildCredential('recover-1'),
        name: 'Recover User',
      });

      expect(result).toEqual({
        token: null,
        user: {
          id: 'user_recover_1',
          email: 'recover@example.com',
          name: 'Recover User',
          image: null,
          emailVerified: false,
          createdAt,
          updatedAt,
        },
      });
      expect(mockAuth.api.sendVerificationOTP).not.toHaveBeenCalled();
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('should identify the latest credential user without staging pending recovery', async () => {
      const createdAt = new Date('2026-03-08T00:00:00.000Z');
      const updatedAt = new Date('2026-03-08T01:00:00.000Z');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_recover_2',
        email: 'recover@example.com',
        name: 'Old Name',
        image: null,
        emailVerified: false,
        createdAt,
        updatedAt,
        deletedAt: null,
        accounts: [{ id: 'account_2', providerId: 'credential' }],
      });

      const result = await service.recoverUnverifiedSignUp({
        email: 'recover@example.com',
        password: buildCredential('recover-2'),
        name: 'New Name',
      });

      expect(result).toEqual({
        token: null,
        user: {
          id: 'user_recover_2',
          email: 'recover@example.com',
          name: 'Old Name',
          image: null,
          emailVerified: false,
          createdAt,
          updatedAt,
        },
      });
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('should not recover unverified sign-up when password is shorter than Better Auth minimum', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_recover_3',
        email: 'recover@example.com',
        name: 'Old Name',
        image: null,
        emailVerified: false,
        createdAt: new Date('2026-03-08T00:00:00.000Z'),
        updatedAt: new Date('2026-03-08T01:00:00.000Z'),
        deletedAt: null,
        accounts: [{ id: 'account_3', providerId: 'credential' }],
      });

      const result = await service.recoverUnverifiedSignUp({
        email: 'recover@example.com',
        password: ['tiny', '7'].join(''),
      });

      expect(result).toBeNull();
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should return null when the existing user is already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_verified_1',
        email: 'verified@example.com',
        name: 'Verified User',
        image: null,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        accounts: [{ id: 'account_3', providerId: 'credential' }],
      });

      const result = await service.recoverUnverifiedSignUp({
        email: 'verified@example.com',
        password: buildCredential('recover-3'),
      });

      expect(result).toBeNull();
      expect(mockAuth.api.sendVerificationOTP).not.toHaveBeenCalled();
    });

    it('should normalize whitespace-only recovery names to null and keep response name stable', async () => {
      const createdAt = new Date('2026-03-08T00:00:00.000Z');
      const updatedAt = new Date('2026-03-08T01:00:00.000Z');
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_recover_4',
        email: 'recover@example.com',
        name: 'Existing Name',
        image: null,
        emailVerified: false,
        createdAt,
        updatedAt,
        deletedAt: null,
        accounts: [{ id: 'account_4', providerId: 'credential' }],
      });

      const result = await service.recoverUnverifiedSignUp({
        email: 'recover@example.com',
        password: buildCredential('recover-4'),
        name: '   ',
      });

      expect(result?.user.name).toBe('Existing Name');
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe('stagePendingSignUpRecovery', () => {
    it('should hash the staged recovery password before caching it in redis', async () => {
      const rawPassword = buildCredential('recover-6');

      await service.stagePendingSignUpRecovery({
        email: 'recover@example.com',
        password: rawPassword,
        name: 'Recovered Name',
      });

      expect(mockRedisService.set.mock.calls[0]?.[0]).toBe(
        'auth:pending-sign-up-recovery:recover@example.com',
      );

      const storedPayload = JSON.parse(
        mockRedisService.set.mock.calls[0]?.[1],
      ) as { password: string; name: string | null };

      expect(storedPayload.password).not.toBe(rawPassword);
      expect(storedPayload.password.length).toBeGreaterThan(rawPassword.length);
      expect(storedPayload.name).toBe('Recovered Name');
    });

    it('should normalize whitespace-only recovery names to null before staging', async () => {
      await service.stagePendingSignUpRecovery({
        email: 'recover@example.com',
        password: buildCredential('recover-7'),
        name: '   ',
      });

      const storedPayload = JSON.parse(
        mockRedisService.set.mock.calls[0]?.[1],
      ) as { password: string; name: string | null };
      expect(storedPayload.name).toBeNull();
    });
  });

  describe('consumePendingSignUpRecovery', () => {
    it('should apply the staged credential updates only after email verification succeeds', async () => {
      await mockRedisService.set(
        'auth:pending-sign-up-recovery:recover@example.com',
        JSON.stringify({
          password: buildCredential('verified'),
          name: 'Verified Name',
        }),
      );
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'account_5' });

      const result = await service.consumePendingSignUpRecovery({
        userId: 'user_recover_5',
        email: 'recover@example.com',
      });

      expect(result).toEqual({ name: 'Verified Name' });
      const accountUpdateInput = mockPrisma.account.update.mock
        .calls[0]?.[0] as
        | {
            where: { id: string };
            data: { password: string };
          }
        | undefined;
      expect(accountUpdateInput?.where).toEqual({ id: 'account_5' });
      expect(typeof accountUpdateInput?.data.password).toBe('string');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_recover_5' },
        data: { name: 'Verified Name' },
      });
      expect(mockRedisService.del).toHaveBeenCalledWith(
        'auth:pending-sign-up-recovery:recover@example.com',
      );
    });
  });

  describe('sendEmailVerificationOTP', () => {
    it('should not remove existing verification rows when otp creation fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_otp_0',
        email: 'demo@example.com',
        emailVerified: false,
        deletedAt: null,
      });
      mockAuth.api.createVerificationOTP = vi
        .fn()
        .mockRejectedValueOnce(new Error('creation failed'));

      await expect(
        service.sendEmailVerificationOTP('demo@example.com'),
      ).rejects.toMatchObject({
        message: 'Failed to send verification code',
        code: 'SEND_FAILED',
        status: 500,
      });

      expect(mockPrisma.verification.deleteMany).not.toHaveBeenCalled();
    });

    it('should create and send a verification otp and clear it on delivery failure', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_otp_1',
        email: 'demo@example.com',
        emailVerified: false,
        deletedAt: null,
      });
      mockAuth.api.createVerificationOTP = vi.fn().mockResolvedValue('123456');
      mockPrisma.verification.findFirst.mockResolvedValue({
        id: 'verification_new_1',
      });
      mockEmailService.sendOTP.mockRejectedValueOnce(new Error('smtp down'));

      await expect(
        service.sendEmailVerificationOTP('demo@example.com'),
      ).rejects.toMatchObject({
        message: 'Failed to send verification code',
        code: 'SEND_FAILED',
        status: 500,
      });

      expect(mockPrisma.verification.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.verification.deleteMany).toHaveBeenCalledWith({
        where: { id: 'verification_new_1' },
      });
    });

    it('should keep refreshing the otp delivery lock while email sending is still pending', async () => {
      vi.useFakeTimers();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_otp_2',
        email: 'demo@example.com',
        emailVerified: false,
        deletedAt: null,
      });
      mockAuth.api.createVerificationOTP = vi.fn().mockResolvedValue('123456');
      mockPrisma.verification.findFirst.mockResolvedValue({
        id: 'verification_new_2',
      });
      mockEmailService.sendOTP.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 6_000);
          }),
      );

      const promise = service.sendEmailVerificationOTP('demo@example.com');

      await vi.advanceTimersByTimeAsync(6_000);

      expect(mockRedisService.compareAndExpire).toHaveBeenCalled();

      await vi.runAllTimersAsync();
      await promise;
      vi.useRealTimers();
    });

    it('should release the otp delivery lock with a compare-and-delete guard', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_otp_4',
        email: 'demo@example.com',
        emailVerified: false,
        deletedAt: null,
      });
      mockAuth.api.createVerificationOTP = vi.fn().mockResolvedValue('123456');
      mockPrisma.verification.findFirst.mockResolvedValue({
        id: 'verification_new_4',
      });

      await service.sendEmailVerificationOTP('demo@example.com');

      expect(mockRedisService.compareAndDelete).toHaveBeenCalledTimes(1);
      expect(mockRedisService.del).not.toHaveBeenCalledWith(
        expect.stringContaining('auth:otp-lock:'),
      );
    });

    it('should keep the freshly delivered otp valid when stale-row cleanup fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_otp_3',
        email: 'demo@example.com',
        emailVerified: false,
        deletedAt: null,
      });
      mockAuth.api.createVerificationOTP = vi.fn().mockResolvedValue('123456');
      mockPrisma.verification.findFirst.mockResolvedValue({
        id: 'verification_new_3',
      });
      mockPrisma.verification.deleteMany.mockRejectedValueOnce(
        new Error('cleanup failed'),
      );

      await expect(
        service.sendEmailVerificationOTP('demo@example.com'),
      ).resolves.toBeUndefined();

      expect(mockEmailService.sendOTP).toHaveBeenCalledWith(
        'demo@example.com',
        '123456',
      );
      expect(mockPrisma.verification.deleteMany).toHaveBeenCalledWith({
        where: {
          identifier: 'email-verification-otp-demo@example.com',
          id: { not: 'verification_new_3' },
        },
      });
      expect(mockPrisma.verification.deleteMany).not.toHaveBeenCalledWith({
        where: { id: 'verification_new_3' },
      });
    });
  });

  describe('assertManagedAuthRateLimit', () => {
    it('should block the 21st forgot-password otp request under the auth limiter rule', async () => {
      for (let i = 1; i <= 20; i += 1) {
        await expect(
          service.assertManagedAuthRateLimit(
            '/api/v1/auth/forget-password/email-otp',
            '127.0.0.1',
          ),
        ).resolves.toBeUndefined();
      }

      await expect(
        service.assertManagedAuthRateLimit(
          '/api/v1/auth/forget-password/email-otp',
          '127.0.0.1',
        ),
      ).rejects.toMatchObject({
        message: 'Too many requests. Please try again later.',
        code: 'TOO_MANY_REQUESTS',
        status: 429,
      });

      expect(mockRedisService.expire).toHaveBeenCalledTimes(1);
    });
  });
});
