/**
 * Source Refresh Processor Tests
 *
 * [PROVIDES]: SourceRefreshProcessor 单元测试
 * [POS]: 测试 RSS/Site Crawl 源刷新执行逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SourceRefreshProcessor } from '../../processors/source-refresh.processor';
import { createMockPrisma } from '../mocks';

describe('SourceRefreshProcessor', () => {
  let processor: SourceRefreshProcessor;
  let mockPrisma: any;
  let mockRssService: any;
  let mockSiteCrawlService: any;
  let mockContentService: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    mockRssService = {
      fetchAndParse: vi.fn(),
    };

    mockSiteCrawlService = {
      crawlSite: vi.fn(),
    };

    mockContentService = {
      ingestContent: vi.fn(),
    };

    processor = new SourceRefreshProcessor(
      mockPrisma as any,
      mockRssService as any,
      mockSiteCrawlService as any,
      mockContentService as any,
    );
  });

  describe('process', () => {
    describe('RSS source refresh', () => {
      const mockRssJob = {
        data: {
          sourceId: 'source-1',
          url: 'https://example.com/rss',
          sourceType: 'RSS',
        },
      };

      it('should refresh RSS source and ingest items', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'SCHEDULED',
          refreshCron: '0 * * * *',
          timezone: 'UTC',
          config: { feedUrl: 'https://example.com/rss', maxItems: 20 },
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });
        mockRssService.fetchAndParse.mockResolvedValue({
          items: [
            {
              url: 'https://example.com/1',
              title: 'Article 1',
              description: 'Desc 1',
            },
            {
              url: 'https://example.com/2',
              title: 'Article 2',
              description: 'Desc 2',
            },
          ],
        });
        mockContentService.ingestContent.mockResolvedValue({ id: 'content-1' });

        const result = await processor.process(mockRssJob as any);

        expect(result).toEqual({
          success: true,
          ingestedCount: 2,
          error: undefined,
        });
        expect(mockRssService.fetchAndParse).toHaveBeenCalledWith({
          feedUrl: 'https://example.com/rss',
          maxItems: 20,
        });
        expect(mockContentService.ingestContent).toHaveBeenCalledTimes(2);
      });

      it('should update lastRefreshAt and nextRefreshAt', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'SCHEDULED',
          refreshCron: '0 * * * *',
          timezone: 'UTC',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });
        mockRssService.fetchAndParse.mockResolvedValue({ items: [] });

        await processor.process(mockRssJob as any);

        expect(mockPrisma.digestSource.update).toHaveBeenCalledWith({
          where: { id: 'source-1' },
          data: {
            lastRefreshAt: expect.any(Date),
            nextRefreshAt: expect.any(Date),
          },
        });
      });

      it('should handle RSS fetch failures', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'SCHEDULED',
          refreshCron: '0 * * * *',
          timezone: 'UTC',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });
        mockRssService.fetchAndParse.mockRejectedValue(
          new Error('RSS fetch failed'),
        );

        const result = await processor.process(mockRssJob as any);

        expect(result).toEqual({
          success: false,
          ingestedCount: 0,
          error: 'RSS fetch failed',
        });
        // Should still update lastRefreshAt even on error
        expect(mockPrisma.digestSource.update).toHaveBeenCalledWith({
          where: { id: 'source-1' },
          data: expect.objectContaining({
            lastRefreshAt: expect.any(Date),
          }),
        });
      });

      it('should use default maxItems when not specified', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: { feedUrl: 'https://example.com/rss' }, // no maxItems
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });
        mockRssService.fetchAndParse.mockResolvedValue({ items: [] });

        await processor.process(mockRssJob as any);

        expect(mockRssService.fetchAndParse).toHaveBeenCalledWith({
          feedUrl: 'https://example.com/rss',
          maxItems: expect.any(Number), // Should use default
        });
      });

      it('should continue ingesting items when one fails', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });
        mockRssService.fetchAndParse.mockResolvedValue({
          items: [
            { url: 'https://example.com/1', title: 'Article 1' },
            { url: 'https://example.com/2', title: 'Article 2' },
          ],
        });
        mockContentService.ingestContent
          .mockRejectedValueOnce(new Error('Ingest failed'))
          .mockResolvedValueOnce({ id: 'content-2' });

        const result = await processor.process(mockRssJob as any);

        expect(result.ingestedCount).toBe(1);
      });
    });

    describe('Site Crawl source refresh', () => {
      const mockSiteCrawlJob = {
        data: {
          sourceId: 'source-2',
          url: 'https://blog.example.com',
          sourceType: 'WEBPAGE',
        },
      };

      it('should refresh Site Crawl source and ingest pages', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-2',
          type: 'siteCrawl',
          enabled: true,
          refreshMode: 'SCHEDULED',
          refreshCron: '0 0 * * *',
          timezone: 'UTC',
          config: {
            siteUrl: 'https://blog.example.com',
            maxPages: 50,
            includeSubdomains: false,
            scrapeContent: true,
          },
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });
        mockSiteCrawlService.crawlSite.mockResolvedValue({
          pages: [
            {
              url: 'https://blog.example.com/1',
              title: 'Page 1',
              fulltext: 'Content 1',
            },
            {
              url: 'https://blog.example.com/2',
              title: 'Page 2',
              fulltext: 'Content 2',
            },
          ],
        });
        mockContentService.ingestContent.mockResolvedValue({ id: 'content-1' });

        const result = await processor.process(mockSiteCrawlJob as any);

        expect(result).toEqual({
          success: true,
          ingestedCount: 2,
          error: undefined,
        });
        expect(mockSiteCrawlService.crawlSite).toHaveBeenCalledWith('user-1', {
          siteUrl: 'https://blog.example.com',
          maxPages: 50,
          includeSubdomains: false,
          pathPatterns: undefined,
          scrapeContent: true,
        });
      });

      it('should fail when userId is missing for Site Crawl', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-2',
          type: 'siteCrawl',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: { siteUrl: 'https://blog.example.com' },
          subscriptionSources: [], // No subscription = no userId
        });

        const result = await processor.process(mockSiteCrawlJob as any);

        expect(result).toEqual({
          success: false,
          ingestedCount: 0,
          error: 'UserId required for Site Crawl source',
        });
      });

      it('should pass pathPatterns to crawlSite', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-2',
          type: 'siteCrawl',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: {
            siteUrl: 'https://blog.example.com',
            pathPatterns: ['/posts/*', '/articles/*'],
          },
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });
        mockSiteCrawlService.crawlSite.mockResolvedValue({ pages: [] });

        await processor.process(mockSiteCrawlJob as any);

        expect(mockSiteCrawlService.crawlSite).toHaveBeenCalledWith(
          'user-1',
          expect.objectContaining({
            pathPatterns: ['/posts/*', '/articles/*'],
          }),
        );
      });
    });

    describe('common scenarios', () => {
      const mockJob = {
        data: {
          sourceId: 'source-1',
          url: 'https://example.com/rss',
          sourceType: 'RSS',
        },
      };

      it('should return early when source not found', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue(null);

        const result = await processor.process(mockJob as any);

        expect(result).toEqual({
          success: false,
          reason: 'Source not found or disabled',
        });
      });

      it('should return early when source is disabled', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-1',
          enabled: false,
        });

        const result = await processor.process(mockJob as any);

        expect(result).toEqual({
          success: false,
          reason: 'Source not found or disabled',
        });
      });

      it('should return error for unknown source type', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-1',
          type: 'unknown',
          enabled: true,
          refreshMode: 'SCHEDULED',
          config: {},
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });

        const result = await processor.process(mockJob as any);

        expect(result).toEqual({
          success: false,
          reason: 'Unknown source type',
        });
      });

      it('should not update nextRefreshAt for non-SCHEDULED sources', async () => {
        mockPrisma.digestSource.findUnique.mockResolvedValue({
          id: 'source-1',
          type: 'rss',
          enabled: true,
          refreshMode: 'MANUAL',
          config: { feedUrl: 'https://example.com/rss' },
          subscriptionSources: [{ subscription: { userId: 'user-1' } }],
        });
        mockRssService.fetchAndParse.mockResolvedValue({ items: [] });

        await processor.process(mockJob as any);

        expect(mockPrisma.digestSource.update).toHaveBeenCalledWith({
          where: { id: 'source-1' },
          data: {
            lastRefreshAt: expect.any(Date),
            // nextRefreshAt should not be set
          },
        });
        const updateData = mockPrisma.digestSource.update.mock.calls[0][0].data;
        expect(updateData.nextRefreshAt).toBeUndefined();
      });

      it('should throw on fatal processor error', async () => {
        mockPrisma.digestSource.findUnique.mockRejectedValue(
          new Error('Database error'),
        );

        await expect(processor.process(mockJob as any)).rejects.toThrow(
          'Database error',
        );
      });
    });
  });
});
