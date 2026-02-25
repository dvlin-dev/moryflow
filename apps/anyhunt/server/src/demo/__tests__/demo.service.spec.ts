/**
 * DemoService 单元测试
 * 测试 Playground 演示功能
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { DemoService } from '../demo.service';
import type { RedisService } from '../../redis/redis.service';
import type { ConfigService } from '@nestjs/config';
import type { ScraperService } from '../../scraper/scraper.service';
import type { MapService } from '../../map/map.service';
import type { ExtractService } from '../../extract/extract.service';
import type { SearchService } from '../../search/search.service';

describe('DemoService', () => {
  let service: DemoService;
  let mockRedis: {
    get: Mock;
    set: Mock;
    incr: Mock;
    expire: Mock;
  };
  let mockConfig: { get: Mock };
  let mockScraperService: { scrapeSync: Mock };
  let mockMapService: { map: Mock };
  let mockExtractService: { extract: Mock };
  let mockSearchService: { search: Mock };

  beforeEach(() => {
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(undefined),
    };

    mockConfig = {
      get: vi.fn().mockReturnValue('test_turnstile_secret'),
    };

    mockScraperService = {
      scrapeSync: vi.fn().mockResolvedValue({
        screenshot: {
          base64: 'base64_screenshot_data',
          width: 1920,
          height: 1080,
          fileSize: 50000,
        },
        markdown: '# Test Page',
        metadata: { title: 'Test' },
      }),
    };

    mockMapService = {
      map: vi.fn().mockResolvedValue({
        links: ['https://example.com/page1', 'https://example.com/page2'],
        count: 2,
      }),
    };

    mockExtractService = {
      extract: vi.fn().mockResolvedValue({
        results: [{ url: 'https://example.com', data: { title: 'Test' } }],
      }),
    };

    mockSearchService = {
      search: vi.fn().mockResolvedValue({
        query: 'test query',
        results: [
          {
            title: 'Result 1',
            url: 'https://result1.com',
            content: 'Content 1',
          },
        ],
      }),
    };

    service = new DemoService(
      mockRedis as unknown as RedisService,
      mockConfig as unknown as ConfigService,
      mockScraperService as unknown as ScraperService,
      mockMapService as unknown as MapService,
      mockExtractService as unknown as ExtractService,
      mockSearchService as unknown as SearchService,
    );
  });

  // ============ IP 限流 ============

  describe('checkIpRateLimit', () => {
    it('should allow when under limit', async () => {
      mockRedis.get.mockResolvedValue('5');

      const result = await service.checkIpRateLimit('192.168.1.1');

      expect(result).toBe(true);
    });

    it('should deny when at limit', async () => {
      mockRedis.get.mockResolvedValue('10');

      const result = await service.checkIpRateLimit('192.168.1.1');

      expect(result).toBe(false);
    });

    it('should deny when over limit', async () => {
      mockRedis.get.mockResolvedValue('15');

      const result = await service.checkIpRateLimit('192.168.1.1');

      expect(result).toBe(false);
    });

    it('should increment counter', async () => {
      mockRedis.get.mockResolvedValue('0');

      await service.checkIpRateLimit('192.168.1.1');

      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('should set expiration', async () => {
      mockRedis.get.mockResolvedValue('0');

      await service.checkIpRateLimit('192.168.1.1');

      expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 60);
    });
  });

  // ============ IP 验证状态 ============

  describe('isIpVerified', () => {
    it('should return true when IP is verified', async () => {
      mockRedis.get.mockResolvedValue('1');

      const result = await service.isIpVerified('192.168.1.1');

      expect(result).toBe(true);
    });

    it('should return false when IP is not verified', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.isIpVerified('192.168.1.1');

      expect(result).toBe(false);
    });
  });

  describe('markIpAsVerified', () => {
    it('should mark IP as verified with TTL', async () => {
      await service.markIpAsVerified('192.168.1.1');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'demo:verified:192.168.1.1',
        '1',
        3600,
      );
    });
  });

  // ============ 小时计数 ============

  describe('incrementHourlyCount', () => {
    it('should increment hourly counter', async () => {
      await service.incrementHourlyCount();

      expect(mockRedis.incr).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 3600);
    });
  });

  // ============ Turnstile 验证 ============

  describe('verifyCaptcha', () => {
    it('should return true when verification succeeds', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: true }),
      });

      const result = await service.verifyCaptcha('valid_token');

      expect(result).toBe(true);
    });

    it('should return false when verification fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: () => Promise.resolve({ success: false }),
      });

      const result = await service.verifyCaptcha('invalid_token');

      expect(result).toBe(false);
    });

    it('should return true when secret not configured', async () => {
      mockConfig.get.mockReturnValue(undefined);

      const newService = new DemoService(
        mockRedis as unknown as RedisService,
        mockConfig as unknown as ConfigService,
        mockScraperService as unknown as ScraperService,
        mockMapService as unknown as MapService,
        mockExtractService as unknown as ExtractService,
        mockSearchService as unknown as SearchService,
      );

      const result = await newService.verifyCaptcha('any_token');

      expect(result).toBe(true);
    });

    it('should return false on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.verifyCaptcha('token');

      expect(result).toBe(false);
    });
  });

  // ============ 截图演示 ============

  describe('captureScreenshot', () => {
    it('should return screenshot data on success', async () => {
      const result = await service.captureScreenshot('https://example.com');

      expect(result.imageDataUrl).toContain('data:image/png;base64,');
      expect(result.processingMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw BadRequestException on failure', async () => {
      mockScraperService.scrapeSync.mockRejectedValue(
        new Error('Screenshot failed'),
      );

      await expect(
        service.captureScreenshot('https://example.com'),
      ).rejects.toThrow('Screenshot failed');
    });

    it('should throw when screenshot not captured', async () => {
      mockScraperService.scrapeSync.mockResolvedValue({
        screenshot: null,
      });

      await expect(
        service.captureScreenshot('https://example.com'),
      ).rejects.toThrow('Screenshot not captured');
    });

    it('should use demo user ID', async () => {
      await service.captureScreenshot('https://example.com');

      expect(mockScraperService.scrapeSync).toHaveBeenCalledWith(
        'demo-playground-user',
        expect.any(Object),
      );
    });
  });

  // ============ Scrape 演示 ============

  describe('scrape', () => {
    it('should return scrape result on success', async () => {
      const result = await service.scrape(
        'https://example.com',
        ['markdown'],
        true,
      );

      expect(result.markdown).toBe('# Test Page');
      expect(result.processingMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw BadRequestException on failure', async () => {
      mockScraperService.scrapeSync.mockRejectedValue(
        new Error('Scrape failed'),
      );

      await expect(
        service.scrape('https://example.com', ['markdown'], true),
      ).rejects.toThrow('Scrape failed');
    });

    it('should pass format options', async () => {
      await service.scrape(
        'https://example.com',
        ['markdown', 'html', 'links'],
        true,
      );

      expect(mockScraperService.scrapeSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          formats: ['markdown', 'html', 'links'],
          onlyMainContent: true,
        }),
      );
    });
  });

  // ============ Map 演示 ============

  describe('map', () => {
    it('should return map result on success', async () => {
      const result = await service.map('https://example.com');

      expect(result.links).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should throw BadRequestException on failure', async () => {
      mockMapService.map.mockRejectedValue(new Error('Map failed'));

      await expect(service.map('https://example.com')).rejects.toThrow(
        'Map failed',
      );
    });

    it('should pass options', async () => {
      await service.map('https://example.com', 'blog', true);

      expect(mockMapService.map).toHaveBeenCalledWith('demo-playground-user', {
        url: 'https://example.com',
        search: 'blog',
        includeSubdomains: true,
        ignoreSitemap: false,
        limit: 20,
      });
    });
  });

  // ============ Crawl 演示 ============

  describe('crawl', () => {
    it('should return crawl result on success', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/page1'],
        count: 1,
      });

      const result = await service.crawl('https://example.com', 2, 5);

      expect(result.pages).toBeDefined();
      expect(result.totalUrls).toBe(1);
    });

    it('should throw BadRequestException on failure', async () => {
      mockMapService.map.mockRejectedValue(new Error('Crawl failed'));

      await expect(service.crawl('https://example.com', 2, 5)).rejects.toThrow(
        'Crawl failed',
      );
    });

    it('should continue on individual page failure', async () => {
      mockMapService.map.mockResolvedValue({
        links: ['https://example.com/page1', 'https://example.com/page2'],
        count: 2,
      });
      mockScraperService.scrapeSync
        .mockResolvedValueOnce({ markdown: 'Content 1' })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await service.crawl('https://example.com', 2, 5);

      expect(result.pages).toHaveLength(2);
    });
  });

  // ============ Extract 演示 ============

  describe('extract', () => {
    it('should return extract result on success', async () => {
      const result = await service.extract(
        'https://example.com',
        'Extract the title',
      );

      expect(result.data).toEqual({ title: 'Test' });
      expect(result.processingMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw BadRequestException on failure', async () => {
      mockExtractService.extract.mockRejectedValue(new Error('Extract failed'));

      await expect(
        service.extract('https://example.com', 'Extract data'),
      ).rejects.toThrow('Extract failed');
    });

    it('should pass schema when provided', async () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
      };

      await service.extract('https://example.com', 'Extract', schema);

      expect(mockExtractService.extract).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          urls: ['https://example.com'],
          prompt: 'Extract',
          schema,
        }),
      );
    });
  });

  // ============ Search 演示 ============

  describe('search', () => {
    it('should return search result on success', async () => {
      const result = await service.search('test query', 10);

      expect(result.results).toHaveLength(1);
      expect(result.query).toBe('test query');
    });

    it('should throw BadRequestException on failure', async () => {
      mockSearchService.search.mockRejectedValue(new Error('Search failed'));

      await expect(service.search('test', 10)).rejects.toThrow('Search failed');
    });

    it('should pass limit', async () => {
      await service.search('query', 20);

      expect(mockSearchService.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: 'query',
          limit: 20,
          scrapeResults: false,
        }),
      );
    });
  });
});
