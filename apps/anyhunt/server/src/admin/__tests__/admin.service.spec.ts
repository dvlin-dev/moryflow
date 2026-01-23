/**
 * AdminService 单元测试
 * 测试管理后台业务逻辑
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from '../admin.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let mockPrisma: {
    user: {
      count: Mock;
      findMany: Mock;
      findUnique: Mock;
      update: Mock;
    };
    subscription: {
      count: Mock;
      findMany: Mock;
      findUnique: Mock;
      update: Mock;
    };
    screenshot: {
      count: Mock;
      groupBy: Mock;
    };
    paymentOrder: {
      aggregate: Mock;
      groupBy: Mock;
      findMany: Mock;
      findUnique: Mock;
      count: Mock;
    };
    session: {
      deleteMany: Mock;
    };
    $transaction: Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      subscription: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      screenshot: {
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      paymentOrder: {
        aggregate: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      session: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    service = new AdminService(mockPrisma as unknown as PrismaService);
  });

  // ============ Dashboard ============

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.subscription.count.mockResolvedValue(25);
      mockPrisma.screenshot.count.mockResolvedValue(500);
      mockPrisma.paymentOrder.aggregate.mockResolvedValue({
        _sum: { amount: 99900 },
      });

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalUsers: 100,
        activeSubscriptions: 25,
        screenshotsToday: 500,
        revenueMTD: 99900,
      });
    });

    it('should handle zero revenue', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.subscription.count.mockResolvedValue(0);
      mockPrisma.screenshot.count.mockResolvedValue(0);
      mockPrisma.paymentOrder.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getDashboardStats();

      expect(result.revenueMTD).toBe(0);
    });
  });

  describe('getChartData', () => {
    it('should return chart data for last 7 days', async () => {
      mockPrisma.screenshot.groupBy.mockResolvedValue([
        { createdAt: new Date('2024-01-07'), _count: { id: 100 } },
        { createdAt: new Date('2024-01-06'), _count: { id: 80 } },
      ]);
      mockPrisma.paymentOrder.groupBy.mockResolvedValue([
        { createdAt: new Date('2024-01-07'), _sum: { amount: 9900 } },
      ]);

      const result = await service.getChartData();

      expect(result.screenshots).toHaveLength(7);
      expect(result.revenue).toHaveLength(7);
    });

    it('should fill missing dates with zero', async () => {
      mockPrisma.screenshot.groupBy.mockResolvedValue([]);
      mockPrisma.paymentOrder.groupBy.mockResolvedValue([]);

      const result = await service.getChartData();

      expect(result.screenshots.every((d) => d.value === 0)).toBe(true);
      expect(result.revenue.every((d) => d.value === 0)).toBe(true);
    });
  });

  // ============ Users ============

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: false,
          emailVerified: true,
          subscription: { tier: 'PRO', status: 'ACTIVE' },
          quota: { monthlyLimit: 1000, monthlyUsed: 100, purchasedQuota: 0 },
          _count: { screenshots: 50, apiKeys: 2 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers({
        page: 1,
        limit: 10,
        isAdmin: undefined,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].subscriptionTier).toBe('PRO');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({
        page: 1,
        limit: 10,
        search: 'test',
        isAdmin: undefined,
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ name: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });

    it('should apply isAdmin filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers({ page: 1, limit: 10, isAdmin: true });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isAdmin: true }),
        }),
      );
    });

    it('should default tier to FREE when no subscription', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user_1',
          email: 'test@example.com',
          name: null,
          isAdmin: false,
          emailVerified: false,
          subscription: null,
          quota: null,
          _count: { screenshots: 0, apiKeys: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers({
        page: 1,
        limit: 10,
        isAdmin: undefined,
      });

      expect(result.items[0].subscriptionTier).toBe('FREE');
    });
  });

  describe('getUser', () => {
    it('should return user details', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        isAdmin: false,
        emailVerified: true,
        deletedAt: null,
        subscription: { tier: 'PRO', status: 'ACTIVE' },
        quota: {
          monthlyLimit: 1000,
          monthlyUsed: 100,
          purchasedQuota: 50,
          periodEndAt: new Date(),
        },
        _count: { screenshots: 50, apiKeys: 2, webhooks: 1 },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getUser('user_1');

      expect(result.id).toBe('user_1');
      expect(result.subscriptionTier).toBe('PRO');
      expect(result.quota?.monthlyLimit).toBe(1000);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUser('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        name: 'Updated Name',
        isAdmin: true,
        subscription: { tier: 'PRO', status: 'ACTIVE' },
        quota: null,
      });

      const result = await service.updateUser('user_1', {
        name: 'Updated Name',
        isAdmin: true,
      });

      expect(result.name).toBe('Updated Name');
      expect(result.isAdmin).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('non_existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1' });

      await service.deleteUser('user_1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should delete user sessions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_1' });

      await service.deleteUser('user_1');

      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============ Subscriptions ============

  describe('getSubscriptions', () => {
    it('should return paginated subscriptions', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub_1',
          userId: 'user_1',
          tier: 'PRO',
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          cancelAtPeriodEnd: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'user_1', email: 'test@example.com', name: 'Test' },
        },
      ]);
      mockPrisma.subscription.count.mockResolvedValue(1);

      const result = await service.getSubscriptions({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].tier).toBe('PRO');
    });

    it('should filter by tier', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      mockPrisma.subscription.count.mockResolvedValue(0);

      await service.getSubscriptions({ page: 1, limit: 10, tier: 'PRO' });

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tier: 'PRO' }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      mockPrisma.subscription.count.mockResolvedValue(0);

      await service.getSubscriptions({ page: 1, limit: 10, status: 'ACTIVE' });

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  describe('getSubscription', () => {
    it('should return subscription details', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        tier: 'PRO',
        status: 'ACTIVE',
        creemCustomerId: 'creem_cust_1',
        creemSubscriptionId: 'creem_sub_1',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user_1', email: 'test@example.com', name: 'Test' },
      });

      const result = await service.getSubscription('sub_1');

      expect(result.id).toBe('sub_1');
      expect(result.creemCustomerId).toBe('creem_cust_1');
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ id: 'sub_1' });
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub_1',
        userId: 'user_1',
        tier: 'TEAM',
        status: 'ACTIVE',
        user: { id: 'user_1', email: 'test@example.com', name: 'Test' },
      });

      const result = await service.updateSubscription('sub_1', {
        tier: 'TEAM',
      });

      expect(result.tier).toBe('TEAM');
    });

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubscription('non_existent', { tier: 'PRO' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ Orders ============

  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      mockPrisma.paymentOrder.findMany.mockResolvedValue([
        {
          id: 'order_1',
          userId: 'user_1',
          creemOrderId: 'creem_order_1',
          type: 'subscription',
          amount: 9900,
          currency: 'USD',
          status: 'completed',
          quotaAmount: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockPrisma.paymentOrder.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user_1', email: 'test@example.com', name: 'Test' },
      ]);

      const result = await service.getOrders({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].userEmail).toBe('test@example.com');
    });

    it('should filter by status', async () => {
      mockPrisma.paymentOrder.findMany.mockResolvedValue([]);
      mockPrisma.paymentOrder.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getOrders({ page: 1, limit: 10, status: 'completed' });

      expect(mockPrisma.paymentOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'completed' }),
        }),
      );
    });

    it('should filter by type', async () => {
      mockPrisma.paymentOrder.findMany.mockResolvedValue([]);
      mockPrisma.paymentOrder.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getOrders({ page: 1, limit: 10, type: 'quota_purchase' });

      expect(mockPrisma.paymentOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'quota_purchase' }),
        }),
      );
    });
  });

  describe('getOrder', () => {
    it('should return order details', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({
        id: 'order_1',
        userId: 'user_1',
        creemOrderId: 'creem_order_1',
        type: 'subscription',
        amount: 9900,
        currency: 'USD',
        status: 'completed',
        quotaAmount: null,
        metadata: { plan: 'pro' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test',
      });

      const result = await service.getOrder('order_1');

      expect(result.id).toBe('order_1');
      expect(result.userEmail).toBe('test@example.com');
      expect(result.metadata).toEqual({ plan: 'pro' });
    });

    it('should throw NotFoundException when order not found', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(null);

      await expect(service.getOrder('non_existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle null user', async () => {
      mockPrisma.paymentOrder.findUnique.mockResolvedValue({
        id: 'order_1',
        userId: 'deleted_user',
        creemOrderId: 'creem_order_1',
        type: 'subscription',
        amount: 9900,
        currency: 'USD',
        status: 'completed',
        quotaAmount: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getOrder('order_1');

      expect(result.userEmail).toBeNull();
      expect(result.userName).toBeNull();
    });
  });
});
