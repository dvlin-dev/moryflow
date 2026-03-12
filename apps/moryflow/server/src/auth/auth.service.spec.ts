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
    incrementWithExpire: MockFn<
      (key: string, ttlSeconds: number) => Promise<number>
    >;
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
      incrementWithExpire: vi.fn(async (key: string, ttlSeconds: number) => {
        void ttlSeconds;
        const nextValue = Number.parseInt(redisState.get(key) ?? '0', 10) + 1;
        redisState.set(key, String(nextValue));
        return nextValue;
      }),
      compareAndDelete: vi.fn(async (key: string, expectedValue: string) => {
        if (redisState.get(key) !== expectedValue) {
          return false;
        }
        redisState.delete(key);
        return true;
      }),
      compareAndExpire: vi.fn(
        async (key: string, expectedValue: string, ttlSeconds: number) => {
          void ttlSeconds;
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

    it('should catch and log otp delivery lock refresh failures from the timer path', async () => {
      vi.useFakeTimers();
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_otp_5',
        email: 'demo@example.com',
        emailVerified: false,
        deletedAt: null,
      });
      mockAuth.api.createVerificationOTP = vi.fn().mockResolvedValue('123456');
      mockPrisma.verification.findFirst.mockResolvedValue({
        id: 'verification_new_5',
      });
      mockRedisService.compareAndExpire.mockRejectedValueOnce(
        new Error('redis down'),
      );
      mockEmailService.sendOTP.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 6_000);
          }),
      );

      const promise = service.sendEmailVerificationOTP('demo@example.com');

      await vi.advanceTimersByTimeAsync(6_000);
      await vi.runAllTimersAsync();
      await promise;

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AuthService] failed to refresh OTP delivery lock:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should deliver the verification otp even when the verification row cannot be read back immediately', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_otp_6',
        email: 'demo@example.com',
        emailVerified: false,
        deletedAt: null,
      });
      mockAuth.api.createVerificationOTP = vi.fn().mockResolvedValue('123456');
      mockPrisma.verification.findFirst.mockResolvedValue(null);

      await expect(
        service.sendEmailVerificationOTP('demo@example.com'),
      ).resolves.toBeUndefined();

      expect(mockEmailService.sendOTP).toHaveBeenCalledWith(
        'demo@example.com',
        '123456',
      );
    });
  });

  describe('sendForgotPasswordOTP', () => {
    it('should deliver the reset otp even when the verification row cannot be read back immediately', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_reset_1',
        email: 'demo@example.com',
        deletedAt: null,
      });
      mockAuth.api.createVerificationOTP = vi.fn().mockResolvedValue('123456');
      mockPrisma.verification.findFirst.mockResolvedValue(null);

      await expect(
        service.sendForgotPasswordOTP('demo@example.com'),
      ).resolves.toBeUndefined();

      expect(mockEmailService.sendOTP).toHaveBeenCalledWith(
        'demo@example.com',
        '123456',
      );
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

      expect(mockRedisService.incrementWithExpire).toHaveBeenCalledTimes(21);
      expect(mockRedisService.expire).not.toHaveBeenCalled();
    });
  });
});
