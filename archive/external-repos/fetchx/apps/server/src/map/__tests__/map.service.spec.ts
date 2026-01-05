/**
 * MapService 单元测试
 * 测试网站 URL 映射逻辑
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { MapService } from '../map.service';
import type { SitemapParser } from '../sitemap-parser';
import type { BrowserPool } from '../../browser/browser-pool';
import type { UrlValidator } from '../../common/validators/url.validator';
import type { ConfigService } from '@nestjs/config';
import type { MapOptions } from '../dto/map.dto';

// 基础选项（包含所有必需字段的默认值）
const baseOptions: Omit<MapOptions, 'url'> = {
  limit: 5000,
  ignoreSitemap: false,
  includeSubdomains: false,
};

describe('MapService', () => {
  let service: MapService;
  let mockSitemapParser: { fetchAndParse: Mock };
  let mockBrowserPool: {
    acquireContext: Mock;
    releaseContext: Mock;
  };
  let mockUrlValidator: { isAllowed: Mock };
  let mockConfig: { get: Mock };
  let mockPage: {
    goto: Mock;
    $$eval: Mock;
    close: Mock;
  };
  let mockContext: { newPage: Mock };

  beforeEach(() => {
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      $$eval: vi.fn().mockResolvedValue([]),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    };

    mockSitemapParser = {
      fetchAndParse: vi.fn().mockResolvedValue([]),
    };

    mockBrowserPool = {
      acquireContext: vi.fn().mockResolvedValue(mockContext),
      releaseContext: vi.fn().mockResolvedValue(undefined),
    };

    mockUrlValidator = {
      isAllowed: vi.fn().mockReturnValue(true),
    };

    mockConfig = {
      get: vi.fn().mockReturnValue(100),
    };

    service = new MapService(
      mockSitemapParser as unknown as SitemapParser,
      mockBrowserPool as unknown as BrowserPool,
      mockUrlValidator as unknown as UrlValidator,
      mockConfig as unknown as ConfigService,
    );
  });

  // ============ SSRF 防护 ============

  describe('SSRF protection', () => {
    it('should throw for blocked URLs', async () => {
      mockUrlValidator.isAllowed.mockReturnValue(false);

      await expect(
        service.map({ ...baseOptions, url: 'http://169.254.169.254' }),
      ).rejects.toThrow('URL not allowed');
    });

    it('should throw for localhost', async () => {
      mockUrlValidator.isAllowed.mockReturnValue(false);

      await expect(
        service.map({ ...baseOptions, url: 'http://localhost:3000' }),
      ).rejects.toThrow('SSRF');
    });

    it('should throw for private IP', async () => {
      mockUrlValidator.isAllowed.mockReturnValue(false);

      await expect(
        service.map({ ...baseOptions, url: 'http://192.168.1.1' }),
      ).rejects.toThrow('SSRF');
    });
  });

  // ============ Sitemap 解析 ============

  describe('sitemap parsing', () => {
    it('should fetch and parse sitemap', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/page1' },
        { url: 'https://example.com/page2' },
        { url: 'https://example.com/page3' },
      ]);

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(mockSitemapParser.fetchAndParse).toHaveBeenCalledWith(
        'https://example.com',
      );
      expect(result.links).toContain('https://example.com/page1');
      expect(result.links).toContain('https://example.com/page2');
    });

    it('should ignore sitemap when ignoreSitemap is true', async () => {
      const result = await service.map({
        ...baseOptions,
        url: 'https://example.com',
        ignoreSitemap: true,
      });

      expect(mockSitemapParser.fetchAndParse).not.toHaveBeenCalled();
    });

    it('should continue on sitemap parse error', async () => {
      mockSitemapParser.fetchAndParse.mockRejectedValue(
        new Error('Sitemap not found'),
      );

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(result.links).toBeDefined();
    });

    it('should filter URLs by search term', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/blog/post1' },
        { url: 'https://example.com/about' },
        { url: 'https://example.com/blog/post2' },
      ]);

      const result = await service.map({
        ...baseOptions,
        url: 'https://example.com',
        search: 'blog',
      });

      expect(result.links).toContain('https://example.com/blog/post1');
      expect(result.links).toContain('https://example.com/blog/post2');
      expect(result.links).not.toContain('https://example.com/about');
    });

    it('should respect limit', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          url: `https://example.com/page${i}`,
        })),
      );

      const result = await service.map({ ...baseOptions, url: 'https://example.com', limit: 10 });

      expect(result.links).toHaveLength(10);
      expect(result.count).toBe(10);
    });
  });

  // ============ 爬取发现 ============

  describe('crawl discovery', () => {
    it('should crawl for additional URLs when sitemap insufficient', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/sitemap-page' },
      ]);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.$$eval.mockResolvedValue([
        'https://example.com/crawled-page1',
        'https://example.com/crawled-page2',
      ]);

      const result = await service.map({
        ...baseOptions,
        url: 'https://example.com',
        limit: 10,
      });

      expect(mockBrowserPool.acquireContext).toHaveBeenCalled();
      expect(result.links).toContain('https://example.com/sitemap-page');
    });

    it('should release browser context after crawling', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([]);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.$$eval.mockResolvedValue([]);

      await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(mockBrowserPool.releaseContext).toHaveBeenCalledWith(mockContext);
    });

    it('should close page after crawling', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([]);

      await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should continue on individual page load failure', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([]);
      mockPage.goto.mockRejectedValue(new Error('Page load failed'));

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(result.links).toBeDefined();
    });
  });

  // ============ URL 过滤 ============

  describe('URL filtering', () => {
    it('should exclude non-HTTP protocols', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/page' },
        { url: 'ftp://example.com/file' },
        { url: 'mailto:test@example.com' },
      ]);

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(result.links).toContain('https://example.com/page');
      expect(result.links).not.toContain('ftp://example.com/file');
      expect(result.links).not.toContain('mailto:test@example.com');
    });

    it('should exclude resource files', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/page' },
        { url: 'https://example.com/image.jpg' },
        { url: 'https://example.com/style.css' },
        { url: 'https://example.com/script.js' },
        { url: 'https://example.com/font.woff2' },
      ]);

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(result.links).toContain('https://example.com/page');
      expect(result.links).not.toContain('https://example.com/image.jpg');
      expect(result.links).not.toContain('https://example.com/style.css');
      expect(result.links).not.toContain('https://example.com/script.js');
    });

    it('should filter by domain (same domain only)', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/page' },
        { url: 'https://other.com/page' },
        { url: 'https://sub.example.com/page' },
      ]);

      const result = await service.map({
        ...baseOptions,
        url: 'https://example.com',
        includeSubdomains: false,
      });

      expect(result.links).toContain('https://example.com/page');
      expect(result.links).not.toContain('https://other.com/page');
      expect(result.links).not.toContain('https://sub.example.com/page');
    });

    it('should include subdomains when enabled', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/page' },
        { url: 'https://blog.example.com/page' },
        { url: 'https://api.example.com/page' },
        { url: 'https://other.com/page' },
      ]);

      const result = await service.map({
        ...baseOptions,
        url: 'https://example.com',
        includeSubdomains: true,
      });

      expect(result.links).toContain('https://example.com/page');
      expect(result.links).toContain('https://blog.example.com/page');
      expect(result.links).toContain('https://api.example.com/page');
      expect(result.links).not.toContain('https://other.com/page');
    });

    it('should deduplicate URLs', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/page' },
        { url: 'https://example.com/page' },
        { url: 'https://example.com/page' },
      ]);

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(result.links.filter((u) => u === 'https://example.com/page')).toHaveLength(1);
    });
  });

  // ============ 默认值 ============

  describe('defaults', () => {
    it('should use default limit of 5000', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue(
        Array.from({ length: 6000 }, (_, i) => ({
          url: `https://example.com/page${i}`,
        })),
      );

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(result.links.length).toBeLessThanOrEqual(5000);
    });

    it('should use ignoreSitemap=false by default', async () => {
      await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(mockSitemapParser.fetchAndParse).toHaveBeenCalled();
    });

    it('should use includeSubdomains=false by default', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/page' },
        { url: 'https://sub.example.com/page' },
      ]);

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(result.links).not.toContain('https://sub.example.com/page');
    });
  });

  // ============ 结果格式 ============

  describe('result format', () => {
    it('should return links and count', async () => {
      mockSitemapParser.fetchAndParse.mockResolvedValue([
        { url: 'https://example.com/page1' },
        { url: 'https://example.com/page2' },
      ]);

      const result = await service.map({ ...baseOptions, url: 'https://example.com' });

      expect(result).toHaveProperty('links');
      expect(result).toHaveProperty('count');
      expect(result.count).toBe(result.links.length);
    });
  });
});
