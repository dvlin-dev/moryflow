/**
 * AuthService 单元测试
 *
 * 测试认证服务的所有公开方法
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';
import { createMockUser, createMockSession } from '../testing/factories';
import { createBetterAuth } from './better-auth';

// Mock better-auth 模块
vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    api: {
      getSession: vi.fn(),
    },
    handler: vi.fn(),
  })),
}));

vi.mock('better-auth/plugins', () => ({
  bearer: vi.fn(() => ({})),
}));

vi.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: vi.fn(() => ({})),
}));

vi.mock('./better-auth', () => ({
  createBetterAuth: vi.fn(() => ({
    api: {
      getSession: vi.fn(),
    },
    handler: vi.fn(),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: MockPrismaService;
  const createBetterAuthMock = vi.mocked(createBetterAuth);
  const createAuthMock = (): ReturnType<typeof createBetterAuth> =>
    ({
      api: { getSession: vi.fn() },
      handler: vi.fn(),
    }) as unknown as ReturnType<typeof createBetterAuth>;

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isAdmin', () => {
    it('管理员用户应返回 true', async () => {
      const adminUser = createMockUser({ isAdmin: true });
      prismaMock.user.findUnique.mockResolvedValue(adminUser);

      const result = await service.isAdmin(adminUser.id);

      expect(result).toBe(true);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: adminUser.id },
        select: { isAdmin: true },
      });
    });

    it('普通用户应返回 false', async () => {
      const normalUser = createMockUser({ isAdmin: false });
      prismaMock.user.findUnique.mockResolvedValue(normalUser);

      const result = await service.isAdmin(normalUser.id);

      expect(result).toBe(false);
    });

    it('用户不存在时应返回 false', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.isAdmin('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('getSessionByToken', () => {
    it('有效 token 应返回完整的用户信息', async () => {
      const user = createMockUser({ tier: 'pro', isAdmin: true });
      const session = createMockSession({
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1小时后过期
      });

      prismaMock.session.findUnique.mockResolvedValue({
        ...session,
        user,
      });

      const result = await service.getSessionByToken(session.token);

      expect(result).not.toBeNull();
      expect(result?.session.token).toBe(session.token);
      expect(result?.user.id).toBe(user.id);
      expect(result?.user.tier).toBe('pro');
      expect(result?.user.isAdmin).toBe(true);
    });

    it('无效 token 应返回 null', async () => {
      prismaMock.session.findUnique.mockResolvedValue(null);

      const result = await service.getSessionByToken('invalid-token');

      expect(result).toBeNull();
    });

    it('过期的 session 应返回 null', async () => {
      const user = createMockUser();
      const expiredSession = createMockSession({
        userId: user.id,
        expiresAt: new Date(Date.now() - 3600 * 1000), // 1小时前过期
      });

      prismaMock.session.findUnique.mockResolvedValue({
        ...expiredSession,
        user,
      });

      const result = await service.getSessionByToken(expiredSession.token);

      expect(result).toBeNull();
    });
  });

  describe('getAuth', () => {
    it('初始化后应返回 Better Auth 实例', () => {
      const authWeb = createAuthMock();
      const authDevice = createAuthMock();
      createBetterAuthMock
        .mockReturnValueOnce(authWeb)
        .mockReturnValueOnce(authDevice);
      void service.onModuleInit();
      const auth = service.getAuth();

      expect(auth).toBeDefined();
      expect(auth.api).toBeDefined();
      expect(auth).toBe(authWeb);
    });
  });

  describe('getAuthForRequest', () => {
    it('有 Origin 时应使用 web auth', () => {
      const authWeb = createAuthMock();
      const authDevice = createAuthMock();
      createBetterAuthMock
        .mockReturnValueOnce(authWeb)
        .mockReturnValueOnce(authDevice);
      void service.onModuleInit();

      const req = { headers: { origin: 'https://app.moryflow.com' } };

      expect(service.getAuthForRequest(req as unknown as ExpressRequest)).toBe(
        authWeb,
      );
    });

    it('无 Origin 且有 Bearer 时应使用 device auth', () => {
      const authWeb = createAuthMock();
      const authDevice = createAuthMock();
      createBetterAuthMock
        .mockReturnValueOnce(authWeb)
        .mockReturnValueOnce(authDevice);
      void service.onModuleInit();

      const req = {
        headers: { authorization: 'Bearer test-token' },
      };

      expect(service.getAuthForRequest(req as unknown as ExpressRequest)).toBe(
        authDevice,
      );
    });

    it('无 Origin 且有 X-App-Platform 时应使用 device auth', () => {
      const authWeb = createAuthMock();
      const authDevice = createAuthMock();
      createBetterAuthMock
        .mockReturnValueOnce(authWeb)
        .mockReturnValueOnce(authDevice);
      void service.onModuleInit();

      const req = {
        headers: { 'x-app-platform': 'mobile' },
      };

      expect(service.getAuthForRequest(req as unknown as ExpressRequest)).toBe(
        authDevice,
      );
    });

    it('无 Origin 且无设备标识时应抛错', () => {
      const authWeb = createAuthMock();
      const authDevice = createAuthMock();
      createBetterAuthMock
        .mockReturnValueOnce(authWeb)
        .mockReturnValueOnce(authDevice);
      void service.onModuleInit();

      const req = { headers: {} };

      expect(() =>
        service.getAuthForRequest(req as unknown as ExpressRequest),
      ).toThrow('Invalid auth request');
    });
  });
});
