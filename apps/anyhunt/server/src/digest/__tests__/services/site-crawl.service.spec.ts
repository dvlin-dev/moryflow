/**
 * Digest Site Crawl Service Tests
 *
 * [PROVIDES]: DigestSiteCrawlService 单元测试
 * [POS]: 测试网站爬取逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DigestSiteCrawlService } from '../../services/site-crawl.service';
import {
  createMockMapService,
  createMockScraperServiceFull,
  createMockUrlValidator,
  type MockMapService,
  type MockScraperServiceFull,
  type MockUrlValidator,
} from '../mocks';
import { SOURCE_DEFAULTS } from '../../digest.constants';

describe('DigestSiteCrawlService', () => {
  let service: DigestSiteCrawlService;
  let mockMapService: MockMapService;
  let mockScraperService: MockScraperServiceFull;
  let mockUrlValidator: MockUrlValidator;

  beforeEach(() => {
    mockMapService = createMockMapService();
    mockScraperService = createMockScraperServiceFull();
    mockUrlValidator = createMockUrlValidator();

    service = new DigestSiteCrawlService(
      mockMapService as any,
      mockScraperService as any,
      mockUrlValidator as any,
    );
  });

  // ========== crawlSite ==========

  describe('crawlSite', () => {
    it('should throw error for disallowed URL', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(false);

      await expect(
        service.crawlSite('user-1', { siteUrl: 'http://localhost' }),
      ).rejects.toThrow('Site URL not allowed');
    });

    it('should crawl site and scrape pages', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/page-1', 'https://example.com/page-2'],
      });

      mockScraperService.scrapeSync
        .mockResolvedValueOnce({
          metadata: {
            title: 'Page 1',
            description: 'Page 1 description',
            ogSiteName: 'Example',
            favicon: 'https://example.com/favicon.ico',
          },
          markdown: 'Page 1 content',
        })
        .mockResolvedValueOnce({
          metadata: {
            title: 'Page 2',
            description: 'Page 2 description',
          },
          markdown: 'Page 2 content',
        });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        maxPages: 10,
      });

      expect(mockMapService.map).toHaveBeenCalledWith('user-1', {
        url: 'https://example.com',
        limit: 30, // maxPages * 3
        includeSubdomains: false,
        ignoreSitemap: false,
      });
      expect(result.pages).toHaveLength(2);
      expect(result.crawledCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(result.discoveredUrls).toHaveLength(2);
    });

    it('should use default maxPages from constants', async () => {
      mockMapService.map.mockResolvedValue({ links: [] });

      await service.crawlSite('user-1', { siteUrl: 'https://example.com' });

      expect(mockMapService.map).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          limit: SOURCE_DEFAULTS.siteCrawlMaxPages * 3,
        }),
      );
    });

    it('should filter URLs by path patterns', async () => {
      mockMapService.map.mockResolvedValue({
        links: [
          'https://example.com/blog/post-1',
          'https://example.com/blog/post-2',
          'https://example.com/about',
          'https://example.com/contact',
        ],
      });

      mockScraperService.scrapeSync.mockResolvedValue({
        metadata: { title: 'Blog Post' },
        markdown: 'Content',
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        pathPatterns: ['/blog/*'],
      });

      // Only blog posts should be crawled
      expect(mockScraperService.scrapeSync).toHaveBeenCalledTimes(2);
      expect(result.pages).toHaveLength(2);
    });

    it('should limit pages to maxPages', async () => {
      mockMapService.map.mockResolvedValue({
        links: [
          'https://example.com/page-1',
          'https://example.com/page-2',
          'https://example.com/page-3',
          'https://example.com/page-4',
          'https://example.com/page-5',
        ],
      });

      mockScraperService.scrapeSync.mockResolvedValue({
        metadata: { title: 'Page' },
        markdown: 'Content',
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        maxPages: 3,
      });

      expect(mockScraperService.scrapeSync).toHaveBeenCalledTimes(3);
      expect(result.pages).toHaveLength(3);
    });

    it('should handle scrape errors gracefully', async () => {
      mockMapService.map.mockResolvedValue({
        links: [
          'https://example.com/page-1',
          'https://example.com/page-2',
          'https://example.com/page-3',
        ],
      });

      mockScraperService.scrapeSync
        .mockResolvedValueOnce({
          metadata: { title: 'Page 1' },
          markdown: 'Content 1',
        })
        .mockRejectedValueOnce(new Error('Scrape failed'))
        .mockResolvedValueOnce({
          metadata: { title: 'Page 3' },
          markdown: 'Content 3',
        });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
      });

      // scrapePage catches errors internally and returns null, so errorCount is not incremented
      // Only 2 successful pages are returned
      expect(result.pages).toHaveLength(2);
      expect(result.crawledCount).toBe(2);
      // errorCount stays 0 because errors are caught inside scrapePage
      expect(result.errorCount).toBe(0);
    });

    it('should skip pages without title', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/page'],
      });

      mockScraperService.scrapeSync.mockResolvedValue({
        metadata: { title: null },
        markdown: 'Content',
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
      });

      expect(result.pages).toHaveLength(0);
    });

    it('should not scrape when scrapeContent is false', async () => {
      mockMapService.map.mockResolvedValue({
        links: [
          'https://example.com/blog/post-1',
          'https://example.com/blog/post-2',
        ],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        scrapeContent: false,
      });

      expect(mockScraperService.scrapeSync).not.toHaveBeenCalled();
      expect(result.pages).toHaveLength(2);
      // Title should be extracted from URL
      expect(result.pages[0].title).toBe('Post 1');
    });

    it('should include subdomains when configured', async () => {
      mockMapService.map.mockResolvedValue({ links: [] });

      await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        includeSubdomains: true,
      });

      expect(mockMapService.map).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          includeSubdomains: true,
        }),
      );
    });

    it('should parse published time from metadata', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/page'],
      });

      mockScraperService.scrapeSync.mockResolvedValue({
        metadata: {
          title: 'Page',
          publishedTime: '2024-01-15T10:00:00Z',
        },
        markdown: 'Content',
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
      });

      expect(result.pages[0].publishedAt).toEqual(
        new Date('2024-01-15T10:00:00Z'),
      );
    });
  });

  // ========== filterByPathPatterns (private, tested via crawlSite) ==========

  describe('path pattern matching', () => {
    beforeEach(() => {
      mockScraperService.scrapeSync.mockResolvedValue({
        metadata: { title: 'Page' },
        markdown: 'Content',
      });
    });

    it('should match exact path', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/about', 'https://example.com/contact'],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        pathPatterns: ['/about'],
      });

      expect(result.pages).toHaveLength(1);
    });

    it('should match wildcard pattern', async () => {
      mockMapService.map.mockResolvedValue({
        links: [
          'https://example.com/blog/2024/post-1',
          'https://example.com/blog/2023/post-2',
          'https://example.com/news/article',
        ],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        pathPatterns: ['/blog/*'],
      });

      expect(result.pages).toHaveLength(2);
    });

    it('should match multiple patterns', async () => {
      mockMapService.map.mockResolvedValue({
        links: [
          'https://example.com/blog/post',
          'https://example.com/news/article',
          'https://example.com/about',
        ],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        pathPatterns: ['/blog/*', '/news/*'],
      });

      expect(result.pages).toHaveLength(2);
    });

    it('should handle invalid URLs gracefully', async () => {
      mockMapService.map.mockResolvedValue({
        links: [
          'https://example.com/valid',
          'not-a-valid-url',
          'https://example.com/another',
        ],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        pathPatterns: ['/*'],
      });

      // Only valid URLs should be processed
      expect(result.pages.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ========== extractTitleFromUrl (private, tested via crawlSite) ==========

  describe('title extraction from URL', () => {
    beforeEach(() => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com'],
      });
    });

    it('should extract title from URL path', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/my-blog-post'],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        scrapeContent: false,
      });

      expect(result.pages[0].title).toBe('My Blog Post');
    });

    it('should use hostname for root URL', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/'],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        scrapeContent: false,
      });

      expect(result.pages[0].title).toBe('example.com');
    });

    it('should remove file extension from title', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/document.html'],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        scrapeContent: false,
      });

      expect(result.pages[0].title).toBe('Document');
    });

    it('should convert hyphens and underscores to spaces', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/my_blog-post_here'],
      });

      const result = await service.crawlSite('user-1', {
        siteUrl: 'https://example.com',
        scrapeContent: false,
      });

      expect(result.pages[0].title).toBe('My Blog Post Here');
    });
  });
});
