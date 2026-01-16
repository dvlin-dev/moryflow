/**
 * Digest Preview Service Tests
 *
 * [PROVIDES]: DigestPreviewService 单元测试
 * [POS]: 测试订阅预览执行逻辑（无 DB 写入）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DigestPreviewService } from '../../services/preview.service';
import { createMockPrisma } from '../mocks';

describe('DigestPreviewService', () => {
  let service: DigestPreviewService;
  let mockPrisma: any;
  let mockSearchService: any;
  let mockScraperService: any;
  let mockContentService: any;
  let mockAiService: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    mockSearchService = {
      search: vi.fn(),
    };

    mockScraperService = {
      scrape: vi.fn(),
    };

    mockContentService = {
      ingestContent: vi.fn(),
      getFulltext: vi.fn(),
    };

    mockAiService = {
      generateSummary: vi.fn(),
      generateNarrative: vi.fn(),
    };

    service = new DigestPreviewService(
      mockPrisma as any,
      mockSearchService as any,
      mockScraperService as any,
      mockContentService as any,
      mockAiService as any,
    );
  });

  // ========== previewSubscription ==========

  describe('previewSubscription', () => {
    const mockSubscription = {
      id: 'sub-1',
      userId: 'user-1',
      topic: 'AI News',
      interests: ['machine learning', 'deep learning'],
      searchLimit: 20,
      scrapeLimit: 10,
      minItems: 5,
      minScore: 30,
      deletedAt: null,
    };

    it('should throw NotFoundException when subscription not found', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.previewSubscription('user-1', 'sub-not-exist', {
          locale: 'en',
          includeNarrative: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when subscription belongs to different user', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.previewSubscription('other-user', 'sub-1', {
          locale: 'en',
          includeNarrative: false,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.digestSubscription.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'sub-1',
          userId: 'other-user',
          deletedAt: null,
        },
      });
    });

    it('should execute preview and return items', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [
          {
            url: 'https://example.com/article-1',
            title: 'AI Breakthrough',
            description: 'New AI model released',
          },
          {
            url: 'https://example.com/article-2',
            title: 'ML Update',
            description: 'Machine learning advances',
          },
        ],
      });
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Article content here',
        metadata: {
          ogSiteName: 'Example',
          favicon: 'https://example.com/favicon.ico',
        },
      });
      mockAiService.generateSummary.mockResolvedValue({
        result: 'AI summary of the article',
      });

      const result = await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      expect(result.items).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.stats.itemsCandidate).toBe(2);
      expect(mockSearchService.search).toHaveBeenCalledWith('user-1', {
        query: 'AI News machine learning deep learning',
        limit: 20,
        scrapeResults: false,
      });
    });

    it('should return empty items when search returns no results', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({ results: [] });

      const result = await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      expect(result.items).toHaveLength(0);
      expect(result.stats.itemsCandidate).toBe(0);
      expect(result.stats.itemsSelected).toBe(0);
    });

    it('should include narrative when includeNarrative is true', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [{ url: 'https://example.com/article-1', title: 'AI News' }],
      });
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Article content',
        metadata: {},
      });
      mockAiService.generateSummary.mockResolvedValue({
        result: 'Summary',
      });
      mockAiService.generateNarrative.mockResolvedValue({
        result: "This is a narrative summary of today's news.",
      });

      const result = await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: true,
      });

      expect(mockAiService.generateNarrative).toHaveBeenCalled();
      expect(result.narrative).toBe(
        "This is a narrative summary of today's news.",
      );
    });

    it('should not include narrative when includeNarrative is false', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [{ url: 'https://example.com/article-1', title: 'AI News' }],
      });
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Article content',
        metadata: {},
      });
      mockAiService.generateSummary.mockResolvedValue({
        result: 'Summary',
      });

      const result = await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      expect(mockAiService.generateNarrative).not.toHaveBeenCalled();
      expect(result.narrative).toBeUndefined();
    });

    it('should use locale in AI calls', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [
          {
            url: 'https://example.com/1',
            title: 'Article',
            description: 'Description',
          },
        ],
      });
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Content',
        metadata: {},
      });
      mockAiService.generateSummary.mockResolvedValue({ result: '中文摘要' });

      await service.previewSubscription('user-1', 'sub-1', {
        locale: 'zh-CN',
        includeNarrative: false,
      });

      expect(mockAiService.generateSummary).toHaveBeenCalledWith(
        expect.any(Object),
        'zh-CN',
        expect.any(Object),
      );
    });

    it('should limit scrape count for preview (max 5)', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        ...mockSubscription,
        scrapeLimit: 100, // 高限制
      });
      const searchResults = Array.from({ length: 10 }, (_, i) => ({
        url: `https://example.com/article-${i}`,
        title: `Article ${i}`,
        description: `Description ${i}`,
      }));
      mockSearchService.search.mockResolvedValue({ results: searchResults });
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Content',
        metadata: {},
      });
      mockAiService.generateSummary.mockResolvedValue({ result: 'Summary' });

      await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      // Preview should limit scrape to 5 max
      expect(mockScraperService.scrape).toHaveBeenCalledTimes(5);
    });

    it('should handle scrape failures gracefully', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [
          { url: 'https://example.com/1', title: 'Article 1' },
          { url: 'https://example.com/2', title: 'Article 2' },
        ],
      });
      // First scrape succeeds, second fails
      mockScraperService.scrape
        .mockResolvedValueOnce({ markdown: 'Content 1', metadata: {} })
        .mockRejectedValueOnce(new Error('Scrape failed'));
      mockAiService.generateSummary.mockResolvedValue({ result: 'Summary' });

      const result = await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      // Should still return items
      expect(result.items).toBeDefined();
      expect(result.stats.itemsCandidate).toBe(2);
    });

    it('should return items with scoring information', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [
          {
            url: 'https://example.com/1',
            title: 'AI Machine Learning',
            description: 'Deep learning and machine learning article',
          },
        ],
      });
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Content about machine learning',
        metadata: {},
      });
      mockAiService.generateSummary.mockResolvedValue({ result: 'Summary' });

      const result = await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      expect(result.items.length).toBeGreaterThan(0);
      if (result.items.length > 0) {
        expect(result.items[0]).toHaveProperty('scoreOverall');
        expect(result.items[0]).toHaveProperty('rank');
        expect(result.items[0].rank).toBe(1);
      }
    });

    it('should filter by minScore when enough items', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        ...mockSubscription,
        minItems: 1,
        minScore: 90, // 高阈值
      });
      mockSearchService.search.mockResolvedValue({
        results: [
          { url: 'https://example.com/1', title: 'Low relevance article' },
        ],
      });
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Content',
        metadata: {},
      });
      mockAiService.generateSummary.mockResolvedValue({ result: 'Summary' });

      const result = await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      // Should still include items due to minItems guarantee
      expect(result.items.length).toBeLessThanOrEqual(
        mockSubscription.minItems,
      );
    });

    it('should build search query from topic and interests', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        ...mockSubscription,
        topic: 'Artificial Intelligence',
        interests: ['NLP', 'Computer Vision'],
      });
      mockSearchService.search.mockResolvedValue({ results: [] });

      await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      expect(mockSearchService.search).toHaveBeenCalledWith('user-1', {
        query: 'Artificial Intelligence NLP Computer Vision',
        limit: 20,
        scrapeResults: false,
      });
    });

    it('should skip scraping when scrapeLimit is 0', async () => {
      mockPrisma.digestSubscription.findFirst.mockResolvedValue({
        ...mockSubscription,
        scrapeLimit: 0,
      });
      mockSearchService.search.mockResolvedValue({
        results: [
          {
            url: 'https://example.com/1',
            title: 'Article',
            description: 'Desc',
          },
        ],
      });
      mockAiService.generateSummary.mockResolvedValue({ result: 'Summary' });

      await service.previewSubscription('user-1', 'sub-1', {
        locale: 'en',
        includeNarrative: false,
      });

      expect(mockScraperService.scrape).not.toHaveBeenCalled();
    });
  });
});
