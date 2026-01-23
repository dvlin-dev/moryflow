/**
 * AuthService 单元测试
 * 测试认证核心服务
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { EmailService } from '../../email/email.service';
import type { RedisService } from '../../redis/redis.service';
import type { Request as ExpressRequest } from 'express';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let mockEmailService: {
    sendOTP: ReturnType<typeof vi.fn>;
  };
  let mockRedisService: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let mockAuth: {
    api: {
      getSession: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    mockEmailService = {
      sendOTP: vi.fn(),
    };

    mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockEmailService as unknown as EmailService,
      mockRedisService as unknown as RedisService,
    );

    // Mock the internal auth instance
    mockAuth = {
      api: {
        getSession: vi.fn(),
      },
    };

    // Replace the auth instance after onModuleInit
    (service as any).auth = mockAuth;
  });

  // ============ getAuth ============

  describe('getAuth', () => {
    it('should return the auth instance', () => {
      const auth = service.getAuth();

      expect(auth).toBe(mockAuth);
    });
  });

  // ============ getSessionFromRequest ============

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
        deletedAt: new Date(), // Soft deleted
        subscription: { tier: 'FREE', status: 'ACTIVE' },
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
        subscription: { tier: 'PRO', status: 'ACTIVE' },
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
          subscriptionTier: 'PRO',
          isAdmin: false,
        },
      });
    });

    it('should default tier to FREE when no subscription', async () => {
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
        subscription: null, // No subscription
      });

      const result = await service.getSessionFromRequest(mockRequest);

      expect(result?.user.subscriptionTier).toBe('FREE');
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
        subscription: { tier: 'TEAM', status: 'ACTIVE' },
      });

      const result = await service.getSessionFromRequest(mockRequest);

      expect(result?.user.isAdmin).toBe(true);
    });

    it('should promote admin when email matches ADMIN_EMAILS', async () => {
      const originalAdminEmails = process.env.ADMIN_EMAILS;
      process.env.ADMIN_EMAILS = 'admin@dvlin.com';

      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user_1' },
        session: { id: 'session_1', expiresAt: new Date() },
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'admin@dvlin.com',
        name: 'Admin User',
        isAdmin: false,
        deletedAt: null,
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user_1',
        isAdmin: true,
      });

      const result = await service.getSessionFromRequest(mockRequest);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { isAdmin: true },
      });
      expect(result?.user.isAdmin).toBe(true);

      if (originalAdminEmails === undefined) {
        delete process.env.ADMIN_EMAILS;
      } else {
        process.env.ADMIN_EMAILS = originalAdminEmails;
      }
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

      expect(mockAuth.api.getSession).toHaveBeenCalledWith({
        headers: expect.any(Headers),
      });
    });
  });
});
