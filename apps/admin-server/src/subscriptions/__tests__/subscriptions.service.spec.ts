/**
 * SubscriptionsService 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from '../subscriptions.service';
import { IDENTITY_PRISMA } from '../../prisma/prisma.module';
import { createMockPrismaClient } from '../../../test/helpers/mock.factory';
import { testSubscriptions, testUsers } from '../../../test/fixtures/seed';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: IDENTITY_PRISMA,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  describe('listSubscriptions', () => {
    it('should return paginated subscription list', async () => {
      const subscriptions = [testSubscriptions.proSubscription];
      mockPrisma.subscription.findMany.mockResolvedValue(subscriptions);
      mockPrisma.subscription.count.mockResolvedValue(1);

      const result = await service.listSubscriptions({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        })
      );
    });

    it('should filter by status', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([testSubscriptions.proSubscription]);
      mockPrisma.subscription.count.mockResolvedValue(1);

      await service.listSubscriptions({ page: 1, limit: 20, status: 'ACTIVE' });

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([testSubscriptions.proSubscription]);
      mockPrisma.subscription.count.mockResolvedValue(1);

      await service.listSubscriptions({ page: 1, limit: 20, userId: testUsers.proUser.id });

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testUsers.proUser.id,
          }),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      mockPrisma.subscription.count.mockResolvedValue(50);

      const result = await service.listSubscriptions({ page: 2, limit: 20 });

      expect(result.totalPages).toBe(3);
      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
    });

    it('should convert dates to ISO strings', async () => {
      const subscription = { ...testSubscriptions.proSubscription };
      mockPrisma.subscription.findMany.mockResolvedValue([subscription]);
      mockPrisma.subscription.count.mockResolvedValue(1);

      const result = await service.listSubscriptions({ page: 1, limit: 20 });

      expect(typeof result.items[0].createdAt).toBe('string');
      expect(typeof result.items[0].currentPeriodStart).toBe('string');
      expect(typeof result.items[0].currentPeriodEnd).toBe('string');
    });

    it('should handle null canceledAt', async () => {
      const subscription = { ...testSubscriptions.proSubscription, canceledAt: null };
      mockPrisma.subscription.findMany.mockResolvedValue([subscription]);
      mockPrisma.subscription.count.mockResolvedValue(1);

      const result = await service.listSubscriptions({ page: 1, limit: 20 });

      expect(result.items[0].canceledAt).toBeNull();
    });
  });

  describe('getSubscriptionById', () => {
    it('should return subscription with user and orders', async () => {
      const subscription = {
        ...testSubscriptions.proSubscription,
        orders: [],
      };
      mockPrisma.subscription.findUnique.mockResolvedValue(subscription);

      const result = await service.getSubscriptionById(subscription.id);

      expect(result.id).toBe(subscription.id);
      expect(result.user).toBeDefined();
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: subscription.id },
        include: {
          user: { select: { id: true, email: true, name: true } },
          orders: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscriptionById('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
