/**
 * Digest Source Service Tests
 *
 * [PROVIDES]: DigestSourceService 单元测试
 * [POS]: 测试多源内容获取与合并逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DigestSourceService } from '../../services/source.service';
import {
  createMockPrisma,
  createMockDigestRssService,
  createMockDigestContentService,
  type MockPrismaDigest,
  type MockDigestRssService,
  type MockDigestContentService,
} from '../mocks';
import { SOURCE_DEFAULTS } from '../../digest.constants';

describe('DigestSourceService', () => {
  let service: DigestSourceService;
  let mockPrisma: MockPrismaDigest;
  let mockRssService: MockDigestRssService;
  let mockContentService: MockDigestContentService;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockRssService = createMockDigestRssService();
    mockContentService = createMockDigestContentService();

    // DigestSourceService uses PrismaService.digestSubscriptionSource
    // We need to add this mock
    (mockPrisma as any).digestSubscriptionSource = {
      findMany: vi.fn(),
    };

    service = new DigestSourceService(
      mockPrisma as any,
      mockRssService as any,
      mockContentService as any,
    );
  });

  // ========== fetchSourceContents ==========

  describe('fetchSourceContents', () => {
    it('should return empty array when no sources found', async () => {
      (mockPrisma as any).digestSubscriptionSource.findMany.mockResolvedValue(
        [],
      );

      const result = await service.fetchSourceContents('sub-1');

      expect(result).toEqual([]);
    });

    it('should fetch RSS source contents', async () => {
      const rssSource = {
        weight: 100,
        source: {
          id: 'source-1',
          type: 'rss',
          config: { feedUrl: 'https://example.com/feed.xml', maxItems: 10 },
        },
      };
      (mockPrisma as any).digestSubscriptionSource.findMany.mockResolvedValue([
        rssSource,
      ]);

      const rssItems = [
        {
          title: 'Article 1',
          url: 'https://example.com/article-1',
          description: 'Description 1',
          pubDate: new Date(),
        },
        {
          title: 'Article 2',
          url: 'https://example.com/article-2',
          description: 'Description 2',
          pubDate: new Date(),
        },
      ];
      mockRssService.fetchAndParse.mockResolvedValue({
        meta: {},
        items: rssItems,
      });
      mockContentService.ingestContent.mockResolvedValue({});

      const result = await service.fetchSourceContents('sub-1');

      expect(mockRssService.fetchAndParse).toHaveBeenCalledWith({
        feedUrl: 'https://example.com/feed.xml',
        maxItems: 10,
      });
      expect(result).toHaveLength(2);
      expect(result[0].sourceType).toBe('rss');
      expect(result[0].sourceId).toBe('source-1');
    });

    it('should skip items outside content window', async () => {
      const rssSource = {
        weight: 100,
        source: {
          id: 'source-1',
          type: 'rss',
          config: { feedUrl: 'https://example.com/feed.xml' },
        },
      };
      (mockPrisma as any).digestSubscriptionSource.findMany.mockResolvedValue([
        rssSource,
      ]);

      const oldDate = new Date(Date.now() - 200 * 60 * 60 * 1000); // 200 hours ago
      const rssItems = [
        {
          title: 'Old Article',
          url: 'https://example.com/old',
          pubDate: oldDate,
        },
        {
          title: 'Recent Article',
          url: 'https://example.com/new',
          pubDate: new Date(),
        },
      ];
      mockRssService.fetchAndParse.mockResolvedValue({
        meta: {},
        items: rssItems,
      });
      mockContentService.ingestContent.mockResolvedValue({});

      const result = await service.fetchSourceContents(
        'sub-1',
        SOURCE_DEFAULTS.contentWindowHours,
      );

      // Only recent article should be included (168 hours = 7 days window)
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Recent Article');
    });

    it('should skip search type sources', async () => {
      const searchSource = {
        weight: 100,
        source: {
          id: 'source-1',
          type: 'search',
          config: { query: 'AI news' },
        },
      };
      (mockPrisma as any).digestSubscriptionSource.findMany.mockResolvedValue([
        searchSource,
      ]);

      const result = await service.fetchSourceContents('sub-1');

      expect(result).toEqual([]);
      expect(mockRssService.fetchAndParse).not.toHaveBeenCalled();
    });

    it('should skip siteCrawl type sources', async () => {
      const crawlSource = {
        weight: 100,
        source: {
          id: 'source-1',
          type: 'siteCrawl',
          config: { siteUrl: 'https://example.com' },
        },
      };
      (mockPrisma as any).digestSubscriptionSource.findMany.mockResolvedValue([
        crawlSource,
      ]);

      const result = await service.fetchSourceContents('sub-1');

      expect(result).toEqual([]);
    });

    it('should continue processing other sources on error', async () => {
      const sources = [
        {
          weight: 100,
          source: {
            id: 'source-1',
            type: 'rss',
            config: { feedUrl: 'https://example.com/bad-feed.xml' },
          },
        },
        {
          weight: 100,
          source: {
            id: 'source-2',
            type: 'rss',
            config: { feedUrl: 'https://example.com/good-feed.xml' },
          },
        },
      ];
      (mockPrisma as any).digestSubscriptionSource.findMany.mockResolvedValue(
        sources,
      );

      mockRssService.fetchAndParse
        .mockRejectedValueOnce(new Error('Bad feed'))
        .mockResolvedValueOnce({
          meta: {},
          items: [
            {
              title: 'Good Article',
              url: 'https://example.com/good',
              pubDate: new Date(),
            },
          ],
        });
      mockContentService.ingestContent.mockResolvedValue({});

      const result = await service.fetchSourceContents('sub-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Good Article');
    });

    it('should use default weight when not specified', async () => {
      const rssSource = {
        weight: null,
        source: {
          id: 'source-1',
          type: 'rss',
          config: { feedUrl: 'https://example.com/feed.xml' },
        },
      };
      (mockPrisma as any).digestSubscriptionSource.findMany.mockResolvedValue([
        rssSource,
      ]);

      mockRssService.fetchAndParse.mockResolvedValue({
        meta: {},
        items: [
          {
            title: 'Article',
            url: 'https://example.com/1',
            pubDate: new Date(),
          },
        ],
      });
      mockContentService.ingestContent.mockResolvedValue({});

      const result = await service.fetchSourceContents('sub-1');

      expect(result[0].weight).toBe(SOURCE_DEFAULTS.weight);
    });
  });

  // ========== mergeContents ==========

  describe('mergeContents', () => {
    it('should merge search results and source contents', () => {
      const searchResults = [
        { url: 'https://example.com/search-1', title: 'Search Result 1' },
        { url: 'https://example.com/search-2', title: 'Search Result 2' },
      ];

      const sourceContents = [
        {
          url: 'https://example.com/rss-1',
          title: 'RSS Article 1',
          sourceType: 'rss' as const,
          weight: 100,
        },
      ];

      const result = service.mergeContents(searchResults, sourceContents);

      expect(result).toHaveLength(3);
      expect(result[0].sourceType).toBe('search');
      expect(result[2].sourceType).toBe('rss');
    });

    it('should deduplicate by URL', () => {
      const searchResults = [
        { url: 'https://example.com/article', title: 'From Search' },
      ];

      const sourceContents = [
        {
          url: 'https://example.com/article', // Same URL
          title: 'From RSS',
          sourceType: 'rss' as const,
          weight: 100,
        },
      ];

      const result = service.mergeContents(searchResults, sourceContents);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('From Search'); // Search has priority
      expect(result[0].sourceType).toBe('search');
    });

    it('should handle empty search results', () => {
      const sourceContents = [
        {
          url: 'https://example.com/rss-1',
          title: 'RSS Article',
          sourceType: 'rss' as const,
        },
      ];

      const result = service.mergeContents([], sourceContents);

      expect(result).toHaveLength(1);
      expect(result[0].sourceType).toBe('rss');
    });

    it('should handle empty source contents', () => {
      const searchResults = [
        { url: 'https://example.com/search-1', title: 'Search Result' },
      ];

      const result = service.mergeContents(searchResults, []);

      expect(result).toHaveLength(1);
      expect(result[0].sourceType).toBe('search');
    });

    it('should use default weight for search results', () => {
      const searchResults = [
        { url: 'https://example.com/article', title: 'Article' },
      ];

      const result = service.mergeContents(searchResults, []);

      expect(result[0].weight).toBe(SOURCE_DEFAULTS.weight);
    });
  });
});
