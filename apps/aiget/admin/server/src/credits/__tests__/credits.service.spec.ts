/**
 * CreditsService 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CreditsService } from '../credits.service';
import { IDENTITY_PRISMA } from '../../prisma/prisma.module';
import { createMockPrismaClient } from '../../../test/helpers/mock.factory';
import { testCreditTransactions, testUsers } from '../../../test/fixtures/seed';

describe('CreditsService', () => {
  let service: CreditsService;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        {
          provide: IDENTITY_PRISMA,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CreditsService>(CreditsService);
  });

  describe('listCredits', () => {
    it('should return paginated credit transaction list', async () => {
      const credits = [
        testCreditTransactions.subscription,
        testCreditTransactions.consumption,
        testCreditTransactions.bonus,
      ];
      mockPrisma.creditTransaction.findMany.mockResolvedValue(credits);
      mockPrisma.creditTransaction.count.mockResolvedValue(3);

      const result = await service.listCredits({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.creditTransaction.findMany).toHaveBeenCalledWith(
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

    it('should filter by type', async () => {
      mockPrisma.creditTransaction.findMany.mockResolvedValue([testCreditTransactions.bonus]);
      mockPrisma.creditTransaction.count.mockResolvedValue(1);

      await service.listCredits({ page: 1, limit: 20, type: 'BONUS' });

      expect(mockPrisma.creditTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'BONUS',
          }),
        })
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.creditTransaction.findMany.mockResolvedValue([
        testCreditTransactions.subscription,
      ]);
      mockPrisma.creditTransaction.count.mockResolvedValue(1);

      await service.listCredits({ page: 1, limit: 20, userId: testUsers.proUser.id });

      expect(mockPrisma.creditTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testUsers.proUser.id,
          }),
        })
      );
    });

    it('should calculate pagination correctly', async () => {
      mockPrisma.creditTransaction.findMany.mockResolvedValue([]);
      mockPrisma.creditTransaction.count.mockResolvedValue(120);

      const result = await service.listCredits({ page: 3, limit: 50 });

      expect(result.totalPages).toBe(3);
      expect(mockPrisma.creditTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100,
          take: 50,
        })
      );
    });

    it('should convert createdAt to ISO string', async () => {
      const credit = { ...testCreditTransactions.subscription };
      mockPrisma.creditTransaction.findMany.mockResolvedValue([credit]);
      mockPrisma.creditTransaction.count.mockResolvedValue(1);

      const result = await service.listCredits({ page: 1, limit: 20 });

      expect(typeof result.items[0].createdAt).toBe('string');
    });

    it('should include positive and negative amounts', async () => {
      const credits = [
        testCreditTransactions.subscription, // positive
        testCreditTransactions.consumption, // negative
      ];
      mockPrisma.creditTransaction.findMany.mockResolvedValue(credits);
      mockPrisma.creditTransaction.count.mockResolvedValue(2);

      const result = await service.listCredits({ page: 1, limit: 20 });

      expect(result.items[0].amount).toBe(5000); // positive
      expect(result.items[1].amount).toBe(-50); // negative
    });
  });
});
