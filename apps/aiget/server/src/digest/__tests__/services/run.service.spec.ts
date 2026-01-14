/**
 * Digest Run Service Tests
 *
 * [PROVIDES]: DigestRunService 单元测试
 * [POS]: 测试订阅运行执行服务的核心逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DigestRunService } from '../../services/run.service';
import {
  createMockPrisma,
  createRun,
  createRunItem,
  createSubscription,
  type MockPrismaDigest,
} from '../mocks';

describe('DigestRunService', () => {
  let service: DigestRunService;
  let mockPrisma: MockPrismaDigest;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new DigestRunService(mockPrisma as any);
  });

  // ========== createRun ==========

  describe('createRun', () => {
    it('should create run with PENDING status', async () => {
      const subscription = createSubscription();
      const expectedRun = createRun({ subscriptionId: subscription.id });
      mockPrisma.digestRun.create.mockResolvedValue(expectedRun);

      const result = await service.createRun(
        subscription.id,
        subscription.userId,
        new Date(),
        'SCHEDULED',
        'en',
      );

      expect(mockPrisma.digestRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          subscriptionId: subscription.id,
          userId: subscription.userId,
          status: 'PENDING',
          source: 'SCHEDULED',
          outputLocale: 'en',
        }),
      });
      expect(result).toEqual(expectedRun);
    });

    it('should include initial billing data', async () => {
      const run = createRun();
      mockPrisma.digestRun.create.mockResolvedValue(run);

      await service.createRun('sub-1', 'user-1', new Date(), 'MANUAL', 'zh');

      expect(mockPrisma.digestRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          billing: expect.objectContaining({
            model: 'FETCHX_ACTUAL',
            totalCredits: 0,
            charged: false,
            breakdown: {},
          }),
        }),
      });
    });
  });

  // ========== startRun ==========

  describe('startRun', () => {
    it('should update status to RUNNING', async () => {
      const run = createRun({ status: 'RUNNING', startedAt: new Date() });
      mockPrisma.digestRun.update.mockResolvedValue(run);

      const result = await service.startRun('run-1');

      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          status: 'RUNNING',
          startedAt: expect.any(Date),
        }),
      });
      expect(result.status).toBe('RUNNING');
    });
  });

  // ========== completeRun ==========

  describe('completeRun', () => {
    it('should update status to SUCCEEDED with result and billing', async () => {
      const runResult = {
        itemsCandidate: 50,
        itemsSelected: 10,
        itemsDelivered: 10,
        itemsDedupSkipped: 5,
        itemsRedelivered: 0,
      };
      const billing = {
        totalCredits: 25,
        breakdown: {
          'fetchx.search': { count: 1, costPerCall: 1, subtotalCredits: 1 },
          'fetchx.scrape': { count: 20, costPerCall: 1, subtotalCredits: 20 },
        },
      };

      const completedRun = createRun({
        status: 'SUCCEEDED',
        finishedAt: new Date(),
        narrativeMarkdown: '## Digest',
      });
      mockPrisma.digestRun.update.mockResolvedValue(completedRun);

      const result = await service.completeRun(
        'run-1',
        runResult,
        billing,
        '## Digest',
      );

      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          status: 'SUCCEEDED',
          finishedAt: expect.any(Date),
          narrativeMarkdown: '## Digest',
          result: runResult,
          billing: expect.objectContaining({
            model: 'FETCHX_ACTUAL',
            totalCredits: 25,
            charged: true,
          }),
        }),
      });
      expect(result.status).toBe('SUCCEEDED');
    });

    it('should mark charged as false when totalCredits is 0', async () => {
      const runResult = {
        itemsCandidate: 0,
        itemsSelected: 0,
        itemsDelivered: 0,
        itemsDedupSkipped: 0,
        itemsRedelivered: 0,
      };
      const billing = { totalCredits: 0, breakdown: {} };

      mockPrisma.digestRun.update.mockResolvedValue(createRun());

      await service.completeRun('run-1', runResult, billing);

      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          billing: expect.objectContaining({
            charged: false,
          }),
        }),
      });
    });
  });

  // ========== failRun ==========

  describe('failRun', () => {
    it('should update status to FAILED with error message', async () => {
      const failedRun = createRun({
        status: 'FAILED',
        error: 'Search API failed',
        finishedAt: new Date(),
      });
      mockPrisma.digestRun.update.mockResolvedValue(failedRun);

      const result = await service.failRun('run-1', 'Search API failed');

      expect(mockPrisma.digestRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          finishedAt: expect.any(Date),
          error: 'Search API failed',
        }),
      });
      expect(result.status).toBe('FAILED');
    });
  });

  // ========== createRunItem ==========

  describe('createRunItem', () => {
    it('should create run item with all data', async () => {
      const item = createRunItem();
      mockPrisma.digestRunItem.create.mockResolvedValue(item);

      const result = await service.createRunItem(
        'run-1',
        'sub-1',
        'user-1',
        'content-1',
        {
          canonicalUrlHash: 'hash-1',
          scoreRelevance: 80,
          scoreOverall: 72,
          scoringReason: 'Matched: AI',
          rank: 1,
          titleSnapshot: 'Test Title',
          urlSnapshot: 'https://example.com',
          aiSummarySnapshot: 'Test summary',
        },
      );

      expect(mockPrisma.digestRunItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          runId: 'run-1',
          subscriptionId: 'sub-1',
          userId: 'user-1',
          contentId: 'content-1',
          canonicalUrlHash: 'hash-1',
          scoreRelevance: 80,
          scoreOverall: 72,
        }),
      });
      expect(result).toEqual(item);
    });
  });

  // ========== createRunItems ==========

  describe('createRunItems', () => {
    it('should batch create run items', async () => {
      mockPrisma.digestRunItem.createMany.mockResolvedValue({ count: 3 });

      const items = [
        {
          contentId: 'c1',
          canonicalUrlHash: 'h1',
          scoreRelevance: 80,
          scoreOverall: 72,
          rank: 1,
          titleSnapshot: 'Title 1',
          urlSnapshot: 'https://example.com/1',
        },
        {
          contentId: 'c2',
          canonicalUrlHash: 'h2',
          scoreRelevance: 70,
          scoreOverall: 65,
          rank: 2,
          titleSnapshot: 'Title 2',
          urlSnapshot: 'https://example.com/2',
        },
        {
          contentId: 'c3',
          canonicalUrlHash: 'h3',
          scoreRelevance: 60,
          scoreOverall: 58,
          rank: 3,
          titleSnapshot: 'Title 3',
          urlSnapshot: 'https://example.com/3',
        },
      ];

      const result = await service.createRunItems(
        'run-1',
        'sub-1',
        'user-1',
        items,
      );

      expect(mockPrisma.digestRunItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ rank: 1 }),
          expect.objectContaining({ rank: 2 }),
          expect.objectContaining({ rank: 3 }),
        ]),
      });
      expect(result).toBe(3);
    });
  });

  // ========== deliverItems ==========

  describe('deliverItems', () => {
    it('should update items deliveredAt and create/update UserContentState', async () => {
      const items = [
        {
          id: 'item-1',
          userId: 'user-1',
          canonicalUrlHash: 'hash-1',
          content: { contentHash: 'content-hash-1' },
        },
      ];
      mockPrisma.digestRunItem.findMany.mockResolvedValue(items);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);

      const mockTx = {
        digestRunItem: { updateMany: vi.fn() },
        userContentState: {
          findMany: vi.fn().mockResolvedValue([]),
          upsert: vi.fn(),
        },
      };
      mockPrisma.$transaction.mockImplementation(async (callback: any) =>
        callback(mockTx),
      );

      await service.deliverItems('run-1', ['item-1']);

      expect(mockPrisma.digestRunItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['item-1'] }, runId: 'run-1' },
        select: expect.any(Object),
      });
    });

    it('should return early when no items found', async () => {
      mockPrisma.digestRunItem.findMany.mockResolvedValue([]);

      await service.deliverItems('run-1', ['item-1']);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ========== findOne ==========

  describe('findOne', () => {
    it('should find run by userId and runId', async () => {
      const run = createRun();
      mockPrisma.digestRun.findFirst.mockResolvedValue(run);

      const result = await service.findOne('user-1', 'run-1');

      expect(mockPrisma.digestRun.findFirst).toHaveBeenCalledWith({
        where: { id: 'run-1', userId: 'user-1' },
      });
      expect(result).toEqual(run);
    });

    it('should return null when not found', async () => {
      mockPrisma.digestRun.findFirst.mockResolvedValue(null);

      const result = await service.findOne('user-1', 'run-not-exist');

      expect(result).toBeNull();
    });
  });

  // ========== findMany ==========

  describe('findMany', () => {
    it('should return paginated runs', async () => {
      const runs = [createRun(), createRun({ id: 'run-2' })];
      mockPrisma.digestRun.findMany.mockResolvedValue(runs);
      mockPrisma.digestRun.count.mockResolvedValue(20);

      const result = await service.findMany('user-1', 'sub-1', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        items: runs,
        total: 20,
        page: 1,
        limit: 10,
        totalPages: 2,
      });
    });

    it('should filter by status', async () => {
      mockPrisma.digestRun.findMany.mockResolvedValue([]);
      mockPrisma.digestRun.count.mockResolvedValue(0);

      await service.findMany('user-1', 'sub-1', {
        page: 1,
        limit: 10,
        status: 'SUCCEEDED',
      });

      expect(mockPrisma.digestRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SUCCEEDED' }),
        }),
      );
    });

    it('should calculate correct skip and totalPages', async () => {
      mockPrisma.digestRun.findMany.mockResolvedValue([]);
      mockPrisma.digestRun.count.mockResolvedValue(55);

      const result = await service.findMany('user-1', 'sub-1', {
        page: 3,
        limit: 20,
      });

      expect(mockPrisma.digestRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3-1) * 20
          take: 20,
        }),
      );
      expect(result.totalPages).toBe(3); // ceil(55/20)
    });
  });

  // ========== findRunItems ==========

  describe('findRunItems', () => {
    it('should return items ordered by rank', async () => {
      const items = [
        createRunItem({ rank: 1 }),
        createRunItem({ id: 'item-2', rank: 2 }),
      ];
      mockPrisma.digestRunItem.findMany.mockResolvedValue(items);

      const result = await service.findRunItems('run-1');

      expect(mockPrisma.digestRunItem.findMany).toHaveBeenCalledWith({
        where: { runId: 'run-1' },
        orderBy: { rank: 'asc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ========== calculateOverallScore ==========

  describe('calculateOverallScore', () => {
    it('should calculate weighted score (50/30/20)', () => {
      const result = service.calculateOverallScore(100, 100, 100);
      expect(result).toBe(100);
    });

    it('should handle mixed scores', () => {
      const result = service.calculateOverallScore(80, 60, 40);
      // 80*0.5 + 60*0.3 + 40*0.2 = 40 + 18 + 8 = 66
      expect(result).toBe(66);
    });

    it('should handle zero scores', () => {
      const result = service.calculateOverallScore(0, 0, 0);
      expect(result).toBe(0);
    });
  });
});
