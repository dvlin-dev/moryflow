/**
 * AdminService 单元测试
 *
 * 测试管理员功能：用户管理、权限控制、日志记录
 */

// Note: expect.objectContaining and expect.any return 'any' type

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma';
import { CreditService } from '../credit';
import {
  createPrismaMock,
  MockPrismaService,
} from '../testing/mocks/prisma.mock';
import {
  createMockUser,
  createMockActivityLog,
  createMockSubscription,
} from '../testing/factories';
import { ActivityLogService } from '../activity-log';
import { EmailService } from '../email';

describe('AdminService', () => {
  let service: AdminService;
  let prismaMock: MockPrismaService;
  let creditServiceMock: {
    getCreditsBalance: ReturnType<typeof vi.fn>;
    grantSubscriptionCredits: ReturnType<typeof vi.fn>;
    grantPurchasedCredits: ReturnType<typeof vi.fn>;
  };
  let activityLogServiceMock: {
    logAdminAction: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };
  let emailServiceMock: {
    sendEmail: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();

    creditServiceMock = {
      getCreditsBalance: vi.fn().mockResolvedValue({
        daily: 15,
        subscription: 0,
        purchased: 0,
        total: 15,
        debt: 0,
        available: 15,
      }),
      grantSubscriptionCredits: vi.fn(),
      grantPurchasedCredits: vi.fn(),
    };

    activityLogServiceMock = {
      logAdminAction: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue({
        logs: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      }),
    };

    emailServiceMock = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CreditService, useValue: creditServiceMock },
        { provide: ActivityLogService, useValue: activityLogServiceMock },
        { provide: EmailService, useValue: emailServiceMock },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== listUsers ====================

  describe('listUsers', () => {
    it('应返回分页用户列表', async () => {
      const users = [
        { ...createMockUser(), subscription: { tier: 'free' } },
        { ...createMockUser(), subscription: { tier: 'basic' } },
        { ...createMockUser(), subscription: { tier: 'pro' } },
      ];
      prismaMock.user.findMany.mockResolvedValue(users);
      prismaMock.user.count.mockResolvedValue(3);

      const result = await service.listUsers({ limit: 10, offset: 0 });

      expect(result.users).toHaveLength(3);
      expect(result.users[0]?.tier).toBe('free');
      expect(result.pagination).toEqual({ count: 3, limit: 10, offset: 0 });
    });

    it('应支持按等级筛选', async () => {
      const proUsers = [{ ...createMockUser(), subscription: { tier: 'pro' } }];
      prismaMock.user.findMany.mockResolvedValue(proUsers);
      prismaMock.user.count.mockResolvedValue(1);

      await service.listUsers({ tier: 'pro', limit: 10, offset: 0 });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subscription: { tier: 'pro' } }),
        }),
      );
    });

    it('应支持分页参数', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(100);

      const result = await service.listUsers({ limit: 20, offset: 40 });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        }),
      );
      expect(result.pagination).toEqual({ count: 100, limit: 20, offset: 40 });
    });
  });

  // ==================== getUserDetails ====================

  describe('getUserDetails', () => {
    it('应返回用户详情和积分余额', async () => {
      const user = { ...createMockUser(), subscription: { tier: 'basic' } };
      prismaMock.user.findUnique.mockResolvedValue(user);

      creditServiceMock.getCreditsBalance.mockResolvedValue({
        daily: 15,
        subscription: 1000,
        purchased: 500,
        total: 1515,
        debt: 0,
        available: 1515,
      });

      const result = await service.getUserDetails(user.id);

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.credits.total).toBe(1515);
    });

    it('用户不存在时应抛出 NotFoundException', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetails('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== setSubscriptionTier ====================

  describe('setSubscriptionTier', () => {
    it('应更新用户等级并记录日志', async () => {
      const user = createMockUser();
      const operatorId = 'admin-123';

      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.subscription.upsert.mockResolvedValue({
        ...createMockSubscription({ userId: user.id, tier: 'pro' }),
      });

      const result = await service.setSubscriptionTier(
        user.id,
        'pro',
        operatorId,
      );

      expect(result.id).toBe(user.id);
      expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: user.id },
          update: expect.objectContaining({ tier: 'pro' }),
        }),
      );
      expect(activityLogServiceMock.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'set_tier',
          operatorId,
          targetUserId: user.id,
        }),
      );
    });
  });

  // ==================== grantCredits ====================

  describe('grantCredits', () => {
    it('应发放订阅积分并记录日志', async () => {
      const userId = 'user-123';
      const operatorId = 'admin-123';

      await service.grantCredits(userId, 'subscription', 1000, operatorId);

      expect(creditServiceMock.grantSubscriptionCredits).toHaveBeenCalledWith(
        userId,
        1000,
        expect.any(Date),
        expect.any(Date),
      );
      expect(activityLogServiceMock.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'grant_credits',
          operatorId,
          targetUserId: userId,
        }),
      );
    });

    it('应发放购买积分', async () => {
      const userId = 'user-123';
      const operatorId = 'admin-123';

      await service.grantCredits(userId, 'purchased', 500, operatorId);

      expect(creditServiceMock.grantPurchasedCredits).toHaveBeenCalledWith(
        userId,
        500,
      );
    });
  });

  // ==================== setAdminPermission ====================

  describe('setAdminPermission', () => {
    it('应授予管理员权限并记录日志', async () => {
      const user = createMockUser({ isAdmin: false });
      const operatorId = 'super-admin';

      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue({
        ...user,
        isAdmin: true,
      });

      const result = await service.setAdminPermission(
        user.id,
        true,
        operatorId,
      );

      expect(result.isAdmin).toBe(true);
      expect(activityLogServiceMock.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'grant_admin',
          operatorId,
          targetUserId: user.id,
        }),
      );
    });

    it('应撤销管理员权限', async () => {
      const user = createMockUser({ isAdmin: true });
      const operatorId = 'super-admin';

      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.user.update.mockResolvedValue({
        ...user,
        isAdmin: false,
      });

      const result = await service.setAdminPermission(
        user.id,
        false,
        operatorId,
      );

      expect(result.isAdmin).toBe(false);
      expect(activityLogServiceMock.logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'revoke_admin',
        }),
      );
    });
  });

  // ==================== getAdminLogs ====================

  describe('getAdminLogs', () => {
    it('应返回分页的操作日志', async () => {
      const logs = [
        {
          ...createMockActivityLog(),
          userEmail: 'admin@example.com',
          targetUserEmail: 'user@example.com',
        },
      ];
      activityLogServiceMock.query.mockResolvedValue({
        logs,
        pagination: { total: 1, limit: 10, offset: 0 },
      });

      const result = await service.getAdminLogs({ limit: 10, offset: 0 });

      expect(result.logs).toHaveLength(1);
      expect(result.pagination).toEqual({ total: 1, limit: 10, offset: 0 });
    });

    it('应使用 admin 分类过滤', async () => {
      await service.getAdminLogs({ limit: 10, offset: 0 });

      expect(activityLogServiceMock.query).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'admin',
        }),
      );
    });
  });
});
