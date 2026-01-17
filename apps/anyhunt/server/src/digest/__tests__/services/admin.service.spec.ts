/**
 * Digest Admin Service Tests
 *
 * [PROVIDES]: DigestAdminService 单元测试
 * [POS]: 测试管理后台数据访问逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DigestAdminService } from '../../services/admin.service';
import { createMockPrisma } from '../mocks';

describe('DigestAdminService', () => {
  let service: DigestAdminService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DigestAdminService(mockPrisma as any);
  });

  // ========== listTopics ==========

  describe('listTopics', () => {
    it('should return paginated topics', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([
        { id: 'topic-1', title: 'AI News', visibility: 'PUBLIC' },
      ]);
      mockPrisma.digestTopic.count.mockResolvedValue(10);

      const result = await service.listTopics({
        page: 1,
        limit: 10,
        featured: undefined,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by visibility', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([]);
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await service.listTopics({
        page: 1,
        limit: 10,
        visibility: 'PUBLIC',
        featured: undefined,
      });

      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: 'PUBLIC',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([]);
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await service.listTopics({
        page: 1,
        limit: 10,
        status: 'PAUSED_BY_ADMIN',
        featured: undefined,
      });

      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PAUSED_BY_ADMIN',
          }),
        }),
      );
    });

    it('should search by title/slug/description', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([]);
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await service.listTopics({
        page: 1,
        limit: 10,
        search: 'AI',
        featured: undefined,
      });

      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'AI', mode: 'insensitive' } },
              { slug: { contains: 'AI', mode: 'insensitive' } },
              { description: { contains: 'AI', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter featured topics', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([]);
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await service.listTopics({ page: 1, limit: 10, featured: true });

      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            featured: true,
          }),
        }),
      );
    });

    it('should apply correct pagination', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([]);
      mockPrisma.digestTopic.count.mockResolvedValue(100);

      await service.listTopics({ page: 3, limit: 20, featured: undefined });

      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3-1) * 20
          take: 20,
        }),
      );
    });
  });

  // ========== getFeaturedTopics ==========

  describe('getFeaturedTopics', () => {
    it('should return featured topics ordered by featuredOrder', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([
        { id: 'topic-1', featured: true, featuredOrder: 0 },
        { id: 'topic-2', featured: true, featuredOrder: 1 },
      ]);

      const result = await service.getFeaturedTopics();

      expect(result).toHaveLength(2);
      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith({
        where: { featured: true },
        orderBy: { featuredOrder: 'asc' },
        include: expect.any(Object),
      });
    });
  });

  // ========== getTopic ==========

  describe('getTopic', () => {
    it('should return topic by id with includes', async () => {
      mockPrisma.digestTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'AI News',
        createdBy: { id: 'user-1', email: 'test@example.com', name: 'Test' },
        _count: { editions: 5, followers: 100 },
      });

      const result = await service.getTopic('topic-1');

      expect(result.id).toBe('topic-1');
      expect(mockPrisma.digestTopic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        include: expect.objectContaining({
          createdBy: expect.any(Object),
          _count: expect.any(Object),
        }),
      });
    });

    it('should throw NotFoundException for non-existent topic', async () => {
      mockPrisma.digestTopic.findUnique.mockResolvedValue(null);

      await expect(service.getTopic('topic-not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== setFeatured ==========

  describe('setFeatured', () => {
    it('should set topic as featured with auto order', async () => {
      mockPrisma.digestTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        featured: false,
      });
      mockPrisma.digestTopic.aggregate.mockResolvedValue({
        _max: { featuredOrder: 5 },
      });
      mockPrisma.digestTopic.update.mockResolvedValue({
        id: 'topic-1',
        featured: true,
        featuredOrder: 6,
      });

      const result = await service.setFeatured('topic-1', 'admin-1', {
        featured: true,
      });

      expect(result.featured).toBe(true);
      expect(result.featuredOrder).toBe(6);
    });

    it('should set topic as featured with specified order', async () => {
      mockPrisma.digestTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        featured: false,
      });
      mockPrisma.digestTopic.update.mockResolvedValue({
        id: 'topic-1',
        featured: true,
        featuredOrder: 0,
      });

      const result = await service.setFeatured('topic-1', 'admin-1', {
        featured: true,
        featuredOrder: 0,
      });

      expect(result.featuredOrder).toBe(0);
    });

    it('should remove from featured', async () => {
      mockPrisma.digestTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        featured: true,
        featuredOrder: 3,
      });
      mockPrisma.digestTopic.update.mockResolvedValue({
        id: 'topic-1',
        featured: false,
        featuredOrder: null,
      });

      const result = await service.setFeatured('topic-1', 'admin-1', {
        featured: false,
      });

      expect(result.featured).toBe(false);
      expect(result.featuredOrder).toBeNull();
    });

    it('should throw NotFoundException for non-existent topic', async () => {
      mockPrisma.digestTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.setFeatured('topic-not-exist', 'admin-1', { featured: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========== reorderFeatured ==========

  describe('reorderFeatured', () => {
    it('should reorder featured topics', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([
        { id: 'topic-1', featured: true },
        { id: 'topic-2', featured: true },
        { id: 'topic-3', featured: true },
      ]);
      mockPrisma.$transaction.mockResolvedValue([]);

      await service.reorderFeatured({
        topicIds: ['topic-3', 'topic-1', 'topic-2'],
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw NotFoundException if topic not found', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([
        { id: 'topic-1', featured: true },
      ]);

      await expect(
        service.reorderFeatured({ topicIds: ['topic-1', 'topic-missing'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if topic not featured', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([
        { id: 'topic-1', featured: true },
        { id: 'topic-2', featured: false },
      ]);

      await expect(
        service.reorderFeatured({ topicIds: ['topic-1', 'topic-2'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========== getStats ==========

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      mockPrisma.digestSubscription.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80); // active

      mockPrisma.digestTopic.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(40); // public

      mockPrisma.digestRun.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(900) // succeeded
        .mockResolvedValueOnce(50); // failed

      mockPrisma.contentItem.count.mockResolvedValue(5000);

      const result = await service.getStats();

      expect(result).toEqual({
        subscriptions: {
          total: 100,
          active: 80,
        },
        topics: {
          total: 50,
          public: 40,
        },
        runs: {
          total: 1000,
          succeeded: 900,
          failed: 50,
          successRate: 90,
        },
        contentPool: {
          totalItems: 5000,
        },
      });
    });

    it('should handle zero runs without division by zero', async () => {
      mockPrisma.digestSubscription.count.mockResolvedValue(0);
      mockPrisma.digestTopic.count.mockResolvedValue(0);
      mockPrisma.digestRun.count.mockResolvedValue(0);
      mockPrisma.contentItem.count.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result.runs.successRate).toBe(0);
    });
  });

  // ========== listSubscriptions ==========

  describe('listSubscriptions', () => {
    it('should return paginated subscriptions', async () => {
      mockPrisma.digestSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          name: 'My Digest',
          topic: 'AI',
          interests: ['ml'],
          enabled: true,
          cron: '0 9 * * *',
          lastRunAt: null,
          nextRunAt: new Date(),
          createdAt: new Date(),
          user: { id: 'user-1', email: 'test@example.com', name: 'Test' },
          _count: { runs: 10 },
        },
      ]);
      mockPrisma.digestSubscription.count.mockResolvedValue(50);

      const result = await service.listSubscriptions({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.items[0].runCount).toBe(10);
    });

    it('should filter by userId', async () => {
      mockPrisma.digestSubscription.findMany.mockResolvedValue([]);
      mockPrisma.digestSubscription.count.mockResolvedValue(0);

      await service.listSubscriptions({ page: 1, limit: 10, userId: 'user-1' });

      expect(mockPrisma.digestSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
      );
    });

    it('should filter by enabled status', async () => {
      mockPrisma.digestSubscription.findMany.mockResolvedValue([]);
      mockPrisma.digestSubscription.count.mockResolvedValue(0);

      await service.listSubscriptions({ page: 1, limit: 10, enabled: true });

      expect(mockPrisma.digestSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enabled: true,
          }),
        }),
      );
    });
  });

  // ========== listRuns ==========

  describe('listRuns', () => {
    it('should return paginated runs', async () => {
      mockPrisma.digestRun.findMany.mockResolvedValue([
        {
          id: 'run-1',
          subscriptionId: 'sub-1',
          userId: 'user-1',
          scheduledAt: new Date(),
          startedAt: new Date(),
          finishedAt: new Date(),
          status: 'SUCCEEDED',
          source: 'SCHEDULER',
          result: {},
          billing: {},
          error: null,
          subscription: { id: 'sub-1', name: 'My Digest' },
          user: { id: 'user-1', email: 'test@example.com' },
        },
      ]);
      mockPrisma.digestRun.count.mockResolvedValue(100);

      const result = await service.listRuns({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(100);
      expect(result.items[0].subscriptionName).toBe('My Digest');
    });

    it('should filter by subscriptionId', async () => {
      mockPrisma.digestRun.findMany.mockResolvedValue([]);
      mockPrisma.digestRun.count.mockResolvedValue(0);

      await service.listRuns({ page: 1, limit: 10, subscriptionId: 'sub-1' });

      expect(mockPrisma.digestRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subscriptionId: 'sub-1',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.digestRun.findMany.mockResolvedValue([]);
      mockPrisma.digestRun.count.mockResolvedValue(0);

      await service.listRuns({ page: 1, limit: 10, status: 'FAILED' });

      expect(mockPrisma.digestRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'FAILED',
          }),
        }),
      );
    });
  });

  // ========== updateTopicStatus ==========

  describe('updateTopicStatus', () => {
    it('should update topic status', async () => {
      mockPrisma.digestTopic.update.mockResolvedValue({
        id: 'topic-1',
        status: 'PAUSED_BY_ADMIN',
      });

      const result = await service.updateTopicStatus(
        'topic-1',
        'PAUSED_BY_ADMIN',
      );

      expect(result.status).toBe('PAUSED_BY_ADMIN');
      expect(mockPrisma.digestTopic.update).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        data: { status: 'PAUSED_BY_ADMIN' },
        select: { id: true, status: true },
      });
    });
  });

  // ========== deleteTopic ==========

  describe('deleteTopic', () => {
    it('should hard delete topic', async () => {
      mockPrisma.digestTopic.delete.mockResolvedValue({});

      await service.deleteTopic('topic-1');

      expect(mockPrisma.digestTopic.delete).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
      });
    });
  });
});
