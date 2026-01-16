/**
 * Source Scheduler Processor Tests
 *
 * [PROVIDES]: SourceSchedulerProcessor 单元测试
 * [POS]: 测试源刷新调度器逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SourceSchedulerProcessor } from '../../processors/source-scheduler.processor';
import { createMockPrisma } from '../mocks';

describe('SourceSchedulerProcessor', () => {
  let processor: SourceSchedulerProcessor;
  let mockPrisma: any;
  let mockRefreshQueue: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    mockRefreshQueue = {
      add: vi.fn(),
    };

    processor = new SourceSchedulerProcessor(
      mockPrisma as any,
      mockRefreshQueue as any,
    );
  });

  describe('process', () => {
    const mockJob = {};

    it('should schedule RSS sources for refresh', async () => {
      const sources = [
        {
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [{ subscription: { deletedAt: null } }],
        },
      ];
      mockPrisma.digestSource.findMany.mockResolvedValue(sources);

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ scheduled: 1, total: 1 });
      expect(mockRefreshQueue.add).toHaveBeenCalledWith(
        'refresh',
        {
          sourceId: 'source-1',
          url: 'https://example.com/rss',
          sourceType: 'RSS',
        },
        expect.objectContaining({
          jobId: expect.stringContaining('source-refresh-source-1'),
          attempts: 3,
        }),
      );
    });

    it('should schedule Site Crawl sources', async () => {
      const sources = [
        {
          id: 'source-2',
          type: 'siteCrawl',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: { siteUrl: 'https://blog.example.com' },
          subscriptionSources: [{ subscription: { deletedAt: null } }],
        },
      ];
      mockPrisma.digestSource.findMany.mockResolvedValue(sources);

      const result = await processor.process(mockJob as any);

      expect(mockRefreshQueue.add).toHaveBeenCalledWith(
        'refresh',
        {
          sourceId: 'source-2',
          url: 'https://blog.example.com',
          sourceType: 'WEBPAGE',
        },
        expect.any(Object),
      );
    });

    it('should skip sources with deleted subscriptions', async () => {
      const sources = [
        {
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [{ subscription: { deletedAt: new Date() } }],
        },
      ];
      mockPrisma.digestSource.findMany.mockResolvedValue(sources);

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ scheduled: 0, total: 0 });
      expect(mockRefreshQueue.add).not.toHaveBeenCalled();
    });

    it('should skip sources with no subscriptions', async () => {
      const sources = [
        {
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [],
        },
      ];
      mockPrisma.digestSource.findMany.mockResolvedValue(sources);

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ scheduled: 0, total: 0 });
    });

    it('should return empty result when no sources to refresh', async () => {
      mockPrisma.digestSource.findMany.mockResolvedValue([]);

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ scheduled: 0, total: 0 });
    });

    it('should continue processing when one source fails', async () => {
      const sources = [
        {
          id: 'source-1',
          type: 'rss',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [{ subscription: { deletedAt: null } }],
        },
        {
          id: 'source-2',
          type: 'rss',
          config: { feedUrl: 'https://example2.com/rss' },
          subscriptionSources: [{ subscription: { deletedAt: null } }],
        },
      ];
      mockPrisma.digestSource.findMany.mockResolvedValue(sources);
      mockRefreshQueue.add
        .mockRejectedValueOnce(new Error('Queue error'))
        .mockResolvedValueOnce(undefined);

      const result = await processor.process(mockJob as any);

      expect(result).toEqual({ scheduled: 1, total: 2 });
    });

    it('should handle unknown source types as API', async () => {
      const sources = [
        {
          id: 'source-1',
          type: 'unknown',
          config: { url: 'https://api.example.com' },
          subscriptionSources: [{ subscription: { deletedAt: null } }],
        },
      ];
      mockPrisma.digestSource.findMany.mockResolvedValue(sources);

      await processor.process(mockJob as any);

      expect(mockRefreshQueue.add).toHaveBeenCalledWith(
        'refresh',
        expect.objectContaining({
          sourceType: 'API',
        }),
        expect.any(Object),
      );
    });

    it('should throw on fatal scheduler error', async () => {
      mockPrisma.digestSource.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'Database error',
      );
    });

    it('should use exponential backoff for job retries', async () => {
      const sources = [
        {
          id: 'source-1',
          type: 'rss',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [{ subscription: { deletedAt: null } }],
        },
      ];
      mockPrisma.digestSource.findMany.mockResolvedValue(sources);

      await processor.process(mockJob as any);

      expect(mockRefreshQueue.add).toHaveBeenCalledWith(
        'refresh',
        expect.any(Object),
        expect.objectContaining({
          backoff: {
            type: 'exponential',
            delay: 10000,
          },
        }),
      );
    });

    it('should query only enabled SCHEDULED sources with past nextRefreshAt', async () => {
      mockPrisma.digestSource.findMany.mockResolvedValue([]);

      await processor.process(mockJob as any);

      expect(mockPrisma.digestSource.findMany).toHaveBeenCalledWith({
        where: {
          enabled: true,
          refreshMode: 'SCHEDULED',
          nextRefreshAt: { lte: expect.any(Date) },
        },
        take: 50,
        include: expect.any(Object),
      });
    });
  });
});
