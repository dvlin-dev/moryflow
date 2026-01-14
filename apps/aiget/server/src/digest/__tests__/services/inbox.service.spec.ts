/**
 * Digest Inbox Service Tests
 *
 * [PROVIDES]: DigestInboxService 单元测试
 * [POS]: 测试用户收件箱服务逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DigestInboxService } from '../../services/inbox.service';
import {
  createMockPrisma,
  createMockDigestFeedbackService,
  createRunItem,
  type MockPrismaDigest,
  type MockDigestFeedbackService,
} from '../mocks';

describe('DigestInboxService', () => {
  let service: DigestInboxService;
  let mockPrisma: MockPrismaDigest;
  let mockFeedbackService: MockDigestFeedbackService;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockFeedbackService = createMockDigestFeedbackService();
    service = new DigestInboxService(
      mockPrisma as any,
      mockFeedbackService as any,
    );
  });

  // ========== findMany ==========

  describe('findMany', () => {
    it('should return paginated inbox items', async () => {
      const items = [
        {
          ...createRunItem(),
          run: {
            subscriptionId: 'sub-1',
            subscription: { name: 'Test Sub' },
          },
          content: {
            siteName: 'Example',
            favicon: 'https://example.com/favicon.ico',
            userContentStates: [],
          },
        },
      ];
      mockPrisma.digestRunItem.findMany.mockResolvedValue(items);
      mockPrisma.digestRunItem.count.mockResolvedValue(1);

      const result = await service.findMany('user-1', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by subscriptionId', async () => {
      mockPrisma.digestRunItem.findMany.mockResolvedValue([]);
      mockPrisma.digestRunItem.count.mockResolvedValue(0);

      await service.findMany('user-1', {
        page: 1,
        limit: 10,
        subscriptionId: 'sub-1',
      });

      expect(mockPrisma.digestRunItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subscriptionId: 'sub-1' }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.digestRunItem.findMany.mockResolvedValue([]);
      mockPrisma.digestRunItem.count.mockResolvedValue(0);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      await service.findMany('user-1', { page: 1, limit: 10, from, to });

      expect(mockPrisma.digestRunItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deliveredAt: expect.objectContaining({
              gte: from,
              lte: to,
            }),
          }),
        }),
      );
    });

    it('should search by title or siteName', async () => {
      mockPrisma.digestRunItem.findMany.mockResolvedValue([]);
      mockPrisma.digestRunItem.count.mockResolvedValue(0);

      await service.findMany('user-1', { page: 1, limit: 10, q: 'AI' });

      expect(mockPrisma.digestRunItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { titleSnapshot: expect.any(Object) },
              { content: expect.any(Object) },
            ]),
          }),
        }),
      );
    });

    it('should include userState in response', async () => {
      const userState = {
        readAt: new Date(),
        savedAt: null,
        notInterestedAt: null,
      };
      const items = [
        {
          ...createRunItem(),
          run: { subscriptionId: 'sub-1', subscription: { name: 'Sub' } },
          content: {
            siteName: 'Example',
            favicon: null,
            userContentStates: [userState],
          },
        },
      ];
      mockPrisma.digestRunItem.findMany.mockResolvedValue(items);
      mockPrisma.digestRunItem.count.mockResolvedValue(1);

      const result = await service.findMany('user-1', { page: 1, limit: 10 });

      expect(result.items[0].userState).toEqual(userState);
    });
  });

  // ========== getStats ==========

  describe('getStats', () => {
    it('should return inbox statistics', async () => {
      mockPrisma.digestRunItem.count.mockResolvedValue(100);
      mockPrisma.digestRunItem.findMany.mockResolvedValue([
        { canonicalUrlHash: 'h1' },
        { canonicalUrlHash: 'h2' },
        { canonicalUrlHash: 'h3' },
      ]);
      mockPrisma.userContentState.findMany.mockResolvedValue([
        { canonicalUrlHash: 'h1' },
      ]);
      mockPrisma.userContentState.count.mockResolvedValue(5);

      const result = await service.getStats('user-1');

      expect(result).toEqual({
        unreadCount: 2, // 3 total - 1 read
        savedCount: 5,
        totalCount: 100,
      });
    });

    it('should return zero unread when all read', async () => {
      mockPrisma.digestRunItem.count.mockResolvedValue(10);
      mockPrisma.digestRunItem.findMany.mockResolvedValue([
        { canonicalUrlHash: 'h1' },
        { canonicalUrlHash: 'h2' },
      ]);
      mockPrisma.userContentState.findMany.mockResolvedValue([
        { canonicalUrlHash: 'h1' },
        { canonicalUrlHash: 'h2' },
      ]);
      mockPrisma.userContentState.count.mockResolvedValue(0);

      const result = await service.getStats('user-1');

      expect(result.unreadCount).toBe(0);
    });
  });

  // ========== updateItemState ==========

  describe('updateItemState', () => {
    const mockItem = {
      id: 'item-1',
      subscriptionId: 'sub-1',
      canonicalUrlHash: 'hash-1',
      titleSnapshot: 'Test Title',
      aiSummarySnapshot: 'Test summary',
      content: { canonicalUrl: 'https://example.com' },
    };

    beforeEach(() => {
      mockPrisma.digestRunItem.findFirst.mockResolvedValue(mockItem);
      mockPrisma.userContentState.upsert.mockResolvedValue({});
    });

    it('should mark item as read', async () => {
      await service.updateItemState('user-1', 'item-1', { action: 'markRead' });

      expect(mockPrisma.userContentState.upsert).toHaveBeenCalledWith({
        where: {
          userId_canonicalUrlHash: {
            userId: 'user-1',
            canonicalUrlHash: 'hash-1',
          },
        },
        create: expect.objectContaining({ readAt: expect.any(Date) }),
        update: expect.objectContaining({ readAt: expect.any(Date) }),
      });
    });

    it('should mark item as unread', async () => {
      await service.updateItemState('user-1', 'item-1', {
        action: 'markUnread',
      });

      expect(mockPrisma.userContentState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ readAt: null }),
        }),
      );
    });

    it('should save item', async () => {
      await service.updateItemState('user-1', 'item-1', { action: 'save' });

      expect(mockPrisma.userContentState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ savedAt: expect.any(Date) }),
        }),
      );
      expect(mockFeedbackService.recordFeedback).toHaveBeenCalledWith(
        'sub-1',
        expect.any(Object),
        'positive',
      );
    });

    it('should unsave item', async () => {
      await service.updateItemState('user-1', 'item-1', { action: 'unsave' });

      expect(mockPrisma.userContentState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ savedAt: null }),
        }),
      );
    });

    it('should mark as not interested', async () => {
      await service.updateItemState('user-1', 'item-1', {
        action: 'notInterested',
      });

      expect(mockPrisma.userContentState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            notInterestedAt: expect.any(Date),
          }),
        }),
      );
      expect(mockFeedbackService.recordFeedback).toHaveBeenCalledWith(
        'sub-1',
        expect.any(Object),
        'negative',
      );
    });

    it('should undo not interested', async () => {
      await service.updateItemState('user-1', 'item-1', {
        action: 'undoNotInterested',
      });

      expect(mockPrisma.userContentState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ notInterestedAt: null }),
        }),
      );
    });

    it('should throw NotFoundException when item not found', async () => {
      mockPrisma.digestRunItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItemState('user-1', 'item-not-exist', {
          action: 'markRead',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not fail when feedback recording fails', async () => {
      mockFeedbackService.recordFeedback.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        service.updateItemState('user-1', 'item-1', { action: 'save' }),
      ).resolves.not.toThrow();
    });
  });

  // ========== markAllRead ==========

  describe('markAllRead', () => {
    it('should mark all items as read', async () => {
      mockPrisma.digestRunItem.findMany.mockResolvedValue([
        { canonicalUrlHash: 'h1' },
        { canonicalUrlHash: 'h2' },
        { canonicalUrlHash: 'h3' },
      ]);
      mockPrisma.userContentState.upsert.mockResolvedValue({});

      const result = await service.markAllRead('user-1');

      expect(mockPrisma.userContentState.upsert).toHaveBeenCalledTimes(3);
      expect(result).toBe(3);
    });

    it('should filter by subscriptionId', async () => {
      mockPrisma.digestRunItem.findMany.mockResolvedValue([
        { canonicalUrlHash: 'h1' },
      ]);
      mockPrisma.userContentState.upsert.mockResolvedValue({});

      await service.markAllRead('user-1', 'sub-1');

      expect(mockPrisma.digestRunItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ subscriptionId: 'sub-1' }),
        }),
      );
    });

    it('should return 0 when no items found', async () => {
      mockPrisma.digestRunItem.findMany.mockResolvedValue([]);

      const result = await service.markAllRead('user-1');

      expect(result).toBe(0);
      expect(mockPrisma.userContentState.upsert).not.toHaveBeenCalled();
    });
  });

  // ========== toResponse ==========

  describe('toResponse', () => {
    it('should format item for API response', () => {
      const item = {
        id: 'item-1',
        runId: 'run-1',
        subscriptionId: 'sub-1',
        contentId: 'content-1',
        canonicalUrlHash: 'hash-1',
        scoreRelevance: 80,
        scoreOverall: 72,
        scoringReason: 'Matched: AI',
        rank: 1,
        titleSnapshot: 'Test Title',
        urlSnapshot: 'https://example.com',
        aiSummarySnapshot: 'Test summary',
        deliveredAt: new Date(),
        run: {
          subscriptionId: 'sub-1',
          subscription: { name: 'Test Sub' },
        },
        content: {
          siteName: 'Example',
          favicon: 'https://example.com/favicon.ico',
        },
        userState: {
          readAt: new Date(),
          savedAt: null,
          notInterestedAt: null,
        },
      };

      const response = service.toResponse(item as any);

      expect(response).toEqual({
        id: 'item-1',
        runId: 'run-1',
        subscriptionId: 'sub-1',
        subscriptionName: 'Test Sub',
        contentId: 'content-1',
        canonicalUrlHash: 'hash-1',
        scoreRelevance: 80,
        scoreOverall: 72,
        scoringReason: 'Matched: AI',
        rank: 1,
        titleSnapshot: 'Test Title',
        urlSnapshot: 'https://example.com',
        aiSummarySnapshot: 'Test summary',
        siteName: 'Example',
        favicon: 'https://example.com/favicon.ico',
        deliveredAt: expect.any(Date),
        readAt: expect.any(Date),
        savedAt: null,
        notInterestedAt: null,
      });
    });
  });
});
