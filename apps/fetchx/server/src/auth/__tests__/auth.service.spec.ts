/**
 * AuthService 单元测试
 * 测试认证核心服务
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { EmailService } from '../../email/email.service';
import type { Request as ExpressRequest } from 'express';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    session: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let mockEmailService: {
    sendOTP: ReturnType<typeof vi.fn>;
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
      },
      session: {
        findUnique: vi.fn(),
      },
    };

    mockEmailService = {
      sendOTP: vi.fn(),
    };

    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockEmailService as unknown as EmailService,
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

  // ============ getSession ============

  describe('getSession', () => {
    const mockRequest = {
      headers: {
        cookie: 'session=abc123',
        authorization: 'Bearer token123',
      },
    } as unknown as ExpressRequest;

    it('should return null when no session exists', async () => {
      mockAuth.api.getSession.mockResolvedValue(null);

      const result = await service.getSession(mockRequest);

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockAuth.api.getSession.mockResolvedValue({
        user: { id: 'user_1' },
        session: { id: 'session_1', expiresAt: new Date() },
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getSession(mockRequest);

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
        subscription: { tier: 'FREE' },
      });

      const result = await service.getSession(mockRequest);

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
        subscription: { tier: 'PRO' },
      });

      const result = await service.getSession(mockRequest);

      expect(result).toEqual({
        session: {
          id: 'session_1',
          expiresAt,
        },
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          tier: 'PRO',
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

      const result = await service.getSession(mockRequest);

      expect(result?.user.tier).toBe('FREE');
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
        subscription: { tier: 'TEAM' },
      });

      const result = await service.getSession(mockRequest);

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

      await service.getSession(requestWithArrayHeader);

      expect(mockAuth.api.getSession).toHaveBeenCalledWith({
        headers: expect.any(Headers),
      });
    });
  });

  // ============ isAdmin ============

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: true });

      const result = await service.isAdmin('admin_1');

      expect(result).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });

      const result = await service.isAdmin('user_1');

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.isAdmin('non_existent');

      expect(result).toBe(false);
    });

    it('should query correct user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isAdmin: false });

      await service.isAdmin('user_123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        select: { isAdmin: true },
      });
    });
  });

  // ============ getSessionByToken ============

  describe('getSessionByToken', () => {
    it('should return null for non-existent session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      const result = await service.getSessionByToken('invalid_token');

      expect(result).toBeNull();
    });

    it('should return null for expired session', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session_1',
        token: 'token_1',
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test',
          isAdmin: false,
          deletedAt: null,
          subscription: { tier: 'FREE' },
        },
      });

      const result = await service.getSessionByToken('token_1');

      expect(result).toBeNull();
    });

    it('should return null for soft-deleted user', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session_1',
        token: 'token_1',
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test',
          isAdmin: false,
          deletedAt: new Date(), // Deleted
          subscription: { tier: 'FREE' },
        },
      });

      const result = await service.getSessionByToken('token_1');

      expect(result).toBeNull();
    });

    it('should return session with user data', async () => {
      const expiresAt = new Date(Date.now() + 86400000);
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session_1',
        token: 'token_abc',
        expiresAt,
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: false,
          deletedAt: null,
          subscription: { tier: 'PRO' },
        },
      });

      const result = await service.getSessionByToken('token_abc');

      expect(result).toEqual({
        session: {
          id: 'session_1',
          token: 'token_abc',
          expiresAt,
        },
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          tier: 'PRO',
          isAdmin: false,
        },
      });
    });

    it('should default tier to FREE when no subscription', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session_1',
        token: 'token_abc',
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test',
          isAdmin: false,
          deletedAt: null,
          subscription: null,
        },
      });

      const result = await service.getSessionByToken('token_abc');

      expect(result?.user.tier).toBe('FREE');
    });

    it('should query with correct token', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await service.getSessionByToken('my_token_123');

      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { token: 'my_token_123' },
        include: {
          user: {
            include: { subscription: true },
          },
        },
      });
    });
  });
});
