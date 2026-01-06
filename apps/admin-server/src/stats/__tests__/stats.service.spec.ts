/**
 * StatsService 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from '../stats.service';
import { IDENTITY_PRISMA } from '../../prisma/prisma.module';
import { createMockPrismaClient } from '../../../test/helpers/mock.factory';

describe('StatsService', () => {
  let service: StatsService;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: IDENTITY_PRISMA,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      // Mock all count queries
      mockPrisma.user.count
        .mockResolvedValueOnce(1000) // totalUsers
        .mockResolvedValueOnce(500) // activeUsers
        .mockResolvedValueOnce(10) // newUsersToday
        .mockResolvedValueOnce(50) // newUsersThisWeek
        .mockResolvedValueOnce(200); // newUsersThisMonth

      // Mock tier distribution
      mockPrisma.user.groupBy.mockResolvedValue([
        { tier: 'FREE', _count: { tier: 700 } },
        { tier: 'STARTER', _count: { tier: 150 } },
        { tier: 'PRO', _count: { tier: 100 } },
        { tier: 'MAX', _count: { tier: 50 } },
      ]);

      // Mock order aggregate
      mockPrisma.order.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });

      // Mock credit aggregates
      mockPrisma.creditTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100000 } }) // granted
        .mockResolvedValueOnce({ _sum: { amount: -75000 } }); // consumed

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 1000,
        activeUsers: 500,
        newUsersToday: 10,
        newUsersThisWeek: 50,
        newUsersThisMonth: 200,
        tierDistribution: {
          FREE: 700,
          STARTER: 150,
          PRO: 100,
          MAX: 50,
        },
        totalRevenue: 50000,
        totalCreditsGranted: 100000,
        totalCreditsConsumed: 75000,
      });
    });

    it('should handle null aggregate values', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.groupBy.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrisma.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getStats();

      expect(result.totalRevenue).toBe(0);
      expect(result.totalCreditsGranted).toBe(0);
      expect(result.totalCreditsConsumed).toBe(0);
      expect(result.tierDistribution).toEqual({
        FREE: 0,
        STARTER: 0,
        PRO: 0,
        MAX: 0,
      });
    });

    it('should query active users within last 30 days', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.groupBy.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      await service.getStats();

      // Check active users query includes session filter
      const activeUsersCall = mockPrisma.user.count.mock.calls[1];
      expect(activeUsersCall[0].where).toHaveProperty('sessions');
      expect(activeUsersCall[0].where.sessions).toHaveProperty('some');
    });

    it('should exclude deleted users from total count', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.groupBy.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
      mockPrisma.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      await service.getStats();

      const totalUsersCall = mockPrisma.user.count.mock.calls[0];
      expect(totalUsersCall[0].where).toHaveProperty('deletedAt', null);
    });

    it('should only count paid orders for revenue', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.groupBy.mockResolvedValue([]);
      mockPrisma.order.aggregate.mockResolvedValue({ _sum: { amount: 10000 } });
      mockPrisma.creditTransaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      await service.getStats();

      expect(mockPrisma.order.aggregate).toHaveBeenCalledWith({
        _sum: { amount: true },
        where: { status: 'PAID' },
      });
    });
  });
});
