/**
 * DigestSubscriptionService 单元测试
 * 覆盖：列表分页（page/limit）查询参数的 skip/take 计算与返回结构
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { DigestSubscriptionService } from '../services/subscription.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('DigestSubscriptionService', () => {
  let service: DigestSubscriptionService;
  let mockPrisma: {
    digestSubscription: { findMany: Mock; count: Mock };
  };

  beforeEach(() => {
    mockPrisma = {
      digestSubscription: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new DigestSubscriptionService(
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('findMany', () => {
    it('should apply page/limit pagination and return meta', async () => {
      mockPrisma.digestSubscription.findMany.mockResolvedValue([
        { id: 'sub_1' },
        { id: 'sub_2' },
      ]);
      mockPrisma.digestSubscription.count.mockResolvedValue(11);

      const result = await service.findMany('user_1', { page: 2, limit: 10 });

      expect(mockPrisma.digestSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user_1', deletedAt: null }),
          skip: 10,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(mockPrisma.digestSubscription.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user_1', deletedAt: null }),
        }),
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(11);
      expect(result.totalPages).toBe(2);
      expect(result.items).toHaveLength(2);
    });
  });
});
