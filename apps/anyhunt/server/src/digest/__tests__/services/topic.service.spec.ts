/**
 * Digest Topic Service Tests
 *
 * [PROVIDES]: DigestTopicService 单元测试
 * [POS]: 测试话题 CRUD、关注、版本管理逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DigestTopicService } from '../../services/topic.service';
import { createMockPrisma } from '../mocks';

describe('DigestTopicService', () => {
  let service: DigestTopicService;
  let mockPrisma: any;
  let mockRateLimitService: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    mockRateLimitService = {
      checkTopicOperation: vi.fn().mockResolvedValue(undefined),
      checkPublicTopicCount: vi.fn().mockResolvedValue(undefined),
      recordTopicOperation: vi.fn().mockResolvedValue(undefined),
    };

    service = new DigestTopicService(
      mockPrisma as any,
      mockRateLimitService as any,
    );
  });

  // ========== create ==========

  describe('create', () => {
    it('should create topic from subscription', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        topic: 'AI News',
        interests: ['ai', 'ml'],
        outputLocale: 'en',
        cron: '0 9 * * *',
        timezone: 'UTC',
      });
      mockPrisma.digestTopic.findUnique.mockResolvedValue(null);
      mockPrisma.digestTopic.create.mockResolvedValue({
        id: 'topic-1',
        slug: 'ai-news',
        title: 'AI News',
        visibility: 'PUBLIC',
      });

      const result = await service.create('user-1', {
        subscriptionId: 'sub-1',
        slug: 'ai-news',
        title: 'AI News',
        visibility: 'PUBLIC',
      });

      expect(result.id).toBe('topic-1');
      expect(mockPrisma.digestTopic.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceSubscriptionId: 'sub-1',
          createdByUserId: 'user-1',
          slug: 'ai-news',
          title: 'AI News',
          visibility: 'PUBLIC',
        }),
      });
    });

    it('should throw NotFoundException for non-existent subscription', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          subscriptionId: 'sub-not-exist',
          slug: 'test',
          title: 'Test',
          visibility: 'PUBLIC',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate slug', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
      });
      mockPrisma.digestTopic.findUnique.mockResolvedValue({
        id: 'existing',
        slug: 'ai-news',
      });

      await expect(
        service.create('user-1', {
          subscriptionId: 'sub-1',
          slug: 'ai-news',
          title: 'AI News',
          visibility: 'PUBLIC',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should check rate limit for public topic', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
      });
      mockPrisma.digestTopic.findUnique.mockResolvedValue(null);
      mockPrisma.digestTopic.create.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PUBLIC',
      });

      await service.create('user-1', {
        subscriptionId: 'sub-1',
        slug: 'ai-news',
        title: 'AI News',
        visibility: 'PUBLIC',
      });

      expect(mockRateLimitService.checkPublicTopicCount).toHaveBeenCalledWith(
        'user-1',
      );
      expect(mockRateLimitService.checkTopicOperation).toHaveBeenCalledWith(
        'user-1',
        'create',
      );
      expect(mockRateLimitService.recordTopicOperation).toHaveBeenCalledWith(
        'user-1',
        'create',
      );
    });

    it('should not check public limits for private topic', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
      });
      mockPrisma.digestTopic.findUnique.mockResolvedValue(null);
      mockPrisma.digestTopic.create.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PRIVATE',
      });

      await service.create('user-1', {
        subscriptionId: 'sub-1',
        slug: 'private-topic',
        title: 'Private',
        visibility: 'PRIVATE',
      });

      expect(mockRateLimitService.checkPublicTopicCount).not.toHaveBeenCalled();
      expect(mockRateLimitService.checkTopicOperation).not.toHaveBeenCalled();
    });
  });

  // ========== update ==========

  describe('update', () => {
    it('should update topic fields', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        createdByUserId: 'user-1',
        visibility: 'PRIVATE',
      });
      mockPrisma.digestTopic.update.mockResolvedValue({
        id: 'topic-1',
        title: 'Updated Title',
      });

      const result = await service.update('user-1', 'topic-1', {
        title: 'Updated Title',
      });

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException for non-existent topic', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'topic-not-exist', { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check rate limit when changing to public', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        createdByUserId: 'user-1',
        visibility: 'PRIVATE',
      });
      mockPrisma.digestTopic.update.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PUBLIC',
      });

      await service.update('user-1', 'topic-1', { visibility: 'PUBLIC' });

      expect(mockRateLimitService.checkPublicTopicCount).toHaveBeenCalledWith(
        'user-1',
      );
      expect(mockRateLimitService.checkTopicOperation).toHaveBeenCalledWith(
        'user-1',
        'update',
      );
    });

    it('should check operation for existing public topic update', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        createdByUserId: 'user-1',
        visibility: 'PUBLIC',
      });
      mockPrisma.digestTopic.update.mockResolvedValue({
        id: 'topic-1',
        title: 'Updated',
      });

      await service.update('user-1', 'topic-1', { title: 'Updated' });

      expect(mockRateLimitService.checkTopicOperation).toHaveBeenCalledWith(
        'user-1',
        'update',
      );
    });
  });

  // ========== delete ==========

  describe('delete', () => {
    it('should delete topic', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        createdByUserId: 'user-1',
      });
      mockPrisma.digestTopic.delete.mockResolvedValue({});

      await service.delete('user-1', 'topic-1');

      expect(mockPrisma.digestTopic.delete).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
      });
    });

    it('should throw NotFoundException for non-existent topic', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue(null);

      await expect(service.delete('user-1', 'topic-not-exist')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== findById ==========

  describe('findById', () => {
    it('should return topic by id', async () => {
      mockPrisma.digestTopic.findUnique.mockResolvedValue({
        id: 'topic-1',
        title: 'AI News',
      });

      const result = await service.findById('topic-1');

      expect(result?.id).toBe('topic-1');
    });

    it('should return null for non-existent topic', async () => {
      mockPrisma.digestTopic.findUnique.mockResolvedValue(null);

      const result = await service.findById('topic-not-exist');

      expect(result).toBeNull();
    });
  });

  // ========== findBySlug ==========

  describe('findBySlug', () => {
    it('should return public topic by slug', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        slug: 'ai-news',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      });

      const result = await service.findBySlug('ai-news');

      expect(result?.slug).toBe('ai-news');
      expect(mockPrisma.digestTopic.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'ai-news',
          visibility: { in: ['PUBLIC', 'UNLISTED'] },
          status: 'ACTIVE',
        },
      });
    });

    it('should return null for non-existent slug', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue(null);

      const result = await service.findBySlug('not-exist');

      expect(result).toBeNull();
    });
  });

  // ========== findPublicTopics ==========

  describe('findPublicTopics', () => {
    it('should return paginated public topics', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([
        { id: 'topic-1', title: 'AI News', visibility: 'PUBLIC' },
      ]);
      mockPrisma.digestTopic.count.mockResolvedValue(10);

      const result = await service.findPublicTopics({
        page: 1,
        limit: 10,
        sort: 'trending',
        featured: undefined,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: 'PUBLIC',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should filter by locale', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([]);
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await service.findPublicTopics({
        page: 1,
        limit: 10,
        sort: 'latest',
        featured: undefined,
        locale: 'zh',
      });

      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            locale: 'zh',
          }),
        }),
      );
    });

    it('should search by keyword', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([]);
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await service.findPublicTopics({
        page: 1,
        limit: 10,
        sort: 'trending',
        featured: undefined,
        q: 'AI',
      });

      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: 'AI', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should sort featured by featuredOrder', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([]);
      mockPrisma.digestTopic.count.mockResolvedValue(0);

      await service.findPublicTopics({
        page: 1,
        limit: 10,
        sort: 'trending',
        featured: true,
      });

      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { featuredOrder: 'asc' },
        }),
      );
    });
  });

  // ========== findUserTopics ==========

  describe('findUserTopics', () => {
    it('should return user topics', async () => {
      mockPrisma.digestTopic.findMany.mockResolvedValue([
        { id: 'topic-1', createdByUserId: 'user-1' },
      ]);

      const result = await service.findUserTopics('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.digestTopic.findMany).toHaveBeenCalledWith({
        where: { createdByUserId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ========== followTopic ==========

  describe('followTopic', () => {
    it('should create subscription for topic', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        title: 'AI News',
        topic: 'AI',
        interests: ['ml'],
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      });
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
        _count: { digestSubscriptions: 0 },
      });
      mockPrisma.digestSubscription.create.mockResolvedValue({
        id: 'sub-1',
        followedTopicId: 'topic-1',
        userId: 'user-1',
      });
      mockPrisma.digestTopic.update.mockResolvedValue({});

      const result = await service.followTopic('user-1', 'topic-1', {});

      expect(result.followedTopicId).toBe('topic-1');
    });

    it('should throw NotFoundException for non-existent topic', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue(null);

      await expect(
        service.followTopic('user-1', 'topic-not-exist', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already following', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      });
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
      });

      await expect(
        service.followTopic('user-1', 'topic-1', {}),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when subscription limit reached', async () => {
      mockPrisma.digestTopic.findFirst.mockResolvedValue({
        id: 'topic-1',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      });
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        subscription: { tier: 'FREE', status: 'ACTIVE' },
        _count: { digestSubscriptions: 100 }, // Exceeds limit
      });

      await expect(
        service.followTopic('user-1', 'topic-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ========== unfollowTopic ==========

  describe('unfollowTopic', () => {
    it('should soft delete subscription', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        followedTopicId: 'topic-1',
        userId: 'user-1',
      });
      mockPrisma.digestSubscription.update.mockResolvedValue({});
      mockPrisma.digestTopic.update.mockResolvedValue({});

      await service.unfollowTopic('user-1', 'topic-1');

      expect(mockPrisma.digestSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when not following', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      await expect(service.unfollowTopic('user-1', 'topic-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== findEditions ==========

  describe('findEditions', () => {
    it('should return topic editions', async () => {
      mockPrisma.digestTopicEdition.findMany.mockResolvedValue([
        { id: 'edition-1', _count: { items: 5 } },
      ]);
      mockPrisma.digestTopicEdition.count.mockResolvedValue(10);

      const result = await service.findEditions('topic-1', {
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(mockPrisma.digestTopicEdition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { topicId: 'topic-1', status: 'SUCCEEDED' },
        }),
      );
    });
  });

  // ========== findEditionById ==========

  describe('findEditionById', () => {
    it('should return edition', async () => {
      mockPrisma.digestTopicEdition.findUnique.mockResolvedValue({
        id: 'edition-1',
      });

      const result = await service.findEditionById('edition-1');

      expect(result?.id).toBe('edition-1');
    });

    it('should return null for non-existent edition', async () => {
      mockPrisma.digestTopicEdition.findUnique.mockResolvedValue(null);

      const result = await service.findEditionById('edition-not-exist');

      expect(result).toBeNull();
    });
  });

  // ========== findEditionItems ==========

  describe('findEditionItems', () => {
    it('should return edition items', async () => {
      mockPrisma.digestTopicEditionItem.findMany.mockResolvedValue([
        {
          id: 'item-1',
          rank: 1,
          content: { siteName: 'Example', favicon: null },
        },
      ]);

      const result = await service.findEditionItems('edition-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.digestTopicEditionItem.findMany).toHaveBeenCalledWith({
        where: { editionId: 'edition-1' },
        orderBy: { rank: 'asc' },
        include: {
          content: { select: { siteName: true, favicon: true } },
        },
      });
    });
  });

  // ========== toResponse ==========

  describe('toResponse', () => {
    it('should format topic for API response', () => {
      const topic = {
        id: 'topic-1',
        slug: 'ai-news',
        title: 'AI News',
        description: 'Latest AI news',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        topic: 'artificial intelligence',
        interests: ['ai', 'ml'],
        locale: 'en',
        cron: '0 9 * * *',
        timezone: 'UTC',
        subscriberCount: 100,
        lastEditionAt: new Date('2024-01-15'),
        createdByUserId: 'user-1',
        createdAt: new Date('2024-01-01'),
      };

      const response = service.toResponse(topic as any);

      expect(response).toEqual({
        id: 'topic-1',
        slug: 'ai-news',
        title: 'AI News',
        description: 'Latest AI news',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        topic: 'artificial intelligence',
        interests: ['ai', 'ml'],
        locale: 'en',
        cron: '0 9 * * *',
        timezone: 'UTC',
        subscriberCount: 100,
        lastEditionAt: expect.any(Date),
        createdByUserId: 'user-1',
        createdAt: expect.any(Date),
      });
    });
  });
});
