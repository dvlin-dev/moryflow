/**
 * SearchService 单元测试
 *
 * 测试搜索服务的核心功能：
 * - 搜索执行（含计费）
 * - 搜索结果富化（抓取内容）
 * - 重试机制
 * - 自动补全
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SearchService } from '../search.service';

// Mock 全局 fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock 类型定义
type MockScraperService = {
  scrapeSync: Mock;
};

type MockBillingService = {
  deductOrThrow: Mock;
  refundOnFailure: Mock;
};

describe('SearchService', () => {
  let service: SearchService;
  let mockScraperService: MockScraperService;
  let mockBillingService: MockBillingService;

  const mockSearchResponse = {
    query: 'test query',
    number_of_results: 100,
    results: [
      {
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Description 1',
        engine: 'google',
        score: 0.9,
      },
      {
        title: 'Result 2',
        url: 'https://example.com/2',
        content: 'Description 2',
        engine: 'google',
        score: 0.8,
      },
    ],
    suggestions: ['suggestion 1', 'suggestion 2'],
  };

  beforeEach(() => {
    mockFetch.mockReset();

    mockScraperService = {
      scrapeSync: vi.fn(),
    };

    mockBillingService = {
      deductOrThrow: vi.fn(),
      refundOnFailure: vi.fn(),
    };

    const mockConfigService = {
      get: vi.fn((key: string) => {
        const config: Record<string, unknown> = {
          SEARXNG_URL: 'http://localhost:8080',
          SEARCH_RETRY_COUNT: 3,
          SEARCH_RETRY_DELAY: 100, // 测试时使用较短延迟
          SEARCH_CONCURRENCY: 2,
        };
        return config[key];
      }),
    };

    service = new SearchService(
      mockConfigService as unknown as ConfigService,
      mockScraperService as any,
      mockBillingService as any,
    );
  });

  describe('search', () => {
    it('should execute search with billing deduction', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: { source: 'credits' },
        amount: 1,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const result = await service.search('user-1', {
        query: 'test query',
        limit: 10,
        scrapeResults: false,
      });

      expect(mockBillingService.deductOrThrow).toHaveBeenCalledWith({
        userId: 'user-1',
        billingKey: 'fetchx.search',
        referenceId: expect.any(String),
      });
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
      expect(result.numberOfResults).toBe(100);
    });

    it('should pass search options to SearXNG', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      await service.search('user-1', {
        query: 'test query',
        limit: 5,
        scrapeResults: false,
        categories: ['general', 'news'],
        engines: ['google', 'bing'],
        language: 'en',
        timeRange: 'week',
        safeSearch: 1,
      });

      // 验证 URL 参数
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('q=test+query'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('categories=general%2Cnews'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('engines=google%2Cbing'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('language=en'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('time_range=week'),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('safesearch=1'),
        expect.any(Object),
      );
    });

    it('should limit results', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue(null);

      const manyResults = {
        ...mockSearchResponse,
        results: Array(20)
          .fill(null)
          .map((_, i) => ({
            title: `Result ${i}`,
            url: `https://example.com/${i}`,
            content: `Description ${i}`,
            engine: 'google',
          })),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(manyResults),
      });

      const result = await service.search('user-1', {
        query: 'test query',
        limit: 5,
        scrapeResults: false,
      });

      expect(result.results).toHaveLength(5);
    });

    it('should refund on search failure', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: { source: 'credits' },
        amount: 1,
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        service.search('user-1', {
          query: 'test query',
          limit: 10,
          scrapeResults: false,
        }),
      ).rejects.toThrow();

      expect(mockBillingService.refundOnFailure).toHaveBeenCalledWith({
        userId: 'user-1',
        billingKey: 'fetchx.search',
        referenceId: expect.any(String),
        source: 'credits',
        amount: 1,
      });
    });
  });

  describe('search with scrapeResults', () => {
    it('should scrape result pages when scrapeResults is true', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      mockScraperService.scrapeSync
        .mockResolvedValueOnce({ markdown: 'Content 1' })
        .mockResolvedValueOnce({ markdown: 'Content 2' });

      const result = await service.search('user-1', {
        query: 'test query',
        limit: 10,
        scrapeResults: true,
      });

      expect(mockScraperService.scrapeSync).toHaveBeenCalledTimes(2);
      expect(result.results[0].content).toBe('Content 1');
      expect(result.results[1].content).toBe('Content 2');
    });

    it('should handle scrape failures gracefully', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      mockScraperService.scrapeSync
        .mockResolvedValueOnce({ markdown: 'Content 1' })
        .mockRejectedValueOnce(new Error('Scrape failed'));

      const result = await service.search('user-1', {
        query: 'test query',
        limit: 10,
        scrapeResults: true,
      });

      // 第一个成功，第二个失败但不影响整体结果
      expect(result.results[0].content).toBe('Content 1');
      expect(result.results[1].content).toBeUndefined();
    });

    it('should pass scrapeOptions to scraper', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockSearchResponse,
            results: [mockSearchResponse.results[0]],
          }),
      });

      mockScraperService.scrapeSync.mockResolvedValue({ markdown: 'Content' });

      await service.search('user-1', {
        query: 'test query',
        limit: 10,
        scrapeResults: true,
        scrapeOptions: { waitFor: 1000 } as any,
      });

      expect(mockScraperService.scrapeSync).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          url: 'https://example.com/1',
          formats: ['markdown'],
          onlyMainContent: true,
          waitFor: 1000,
        }),
      );
    });
  });

  describe('retry mechanism', () => {
    it('should retry on failure', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue(null);

      // 前两次失败，第三次成功
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });

      const result = await service.search('user-1', {
        query: 'test query',
        limit: 10,
        scrapeResults: false,
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.results).toHaveLength(2);
    });

    it('should throw after max retries', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: { source: 'credits' },
        amount: 1,
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        service.search('user-1', {
          query: 'test query',
          limit: 10,
          scrapeResults: false,
        }),
      ).rejects.toThrow('Network error');

      expect(mockFetch).toHaveBeenCalledTimes(3); // retryCount = 3
    });

    it('should retry on non-ok response', async () => {
      mockBillingService.deductOrThrow.mockResolvedValue({
        deduct: { source: 'credits' },
        amount: 1,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse),
        });

      const result = await service.search('user-1', {
        query: 'test query',
        limit: 10,
        scrapeResults: false,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('getAutocomplete', () => {
    it('should return suggestions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(['test', ['test query', 'test search', 'testing']]),
      });

      const result = await service.getAutocomplete('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/autocompleter'),
        expect.any(Object),
      );
      expect(result).toEqual(['test query', 'test search', 'testing']);
    });

    it('should return empty array on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.getAutocomplete('test');

      expect(result).toEqual([]);
    });

    it('should return empty array on non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const result = await service.getAutocomplete('test');

      expect(result).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should use default SearXNG URL when not configured', async () => {
      const mockConfigService = {
        get: vi.fn(() => undefined),
      };

      const svc = new SearchService(
        mockConfigService as unknown as ConfigService,
        mockScraperService as any,
        mockBillingService as any,
      );

      mockBillingService.deductOrThrow.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      await svc.search('user-1', {
        query: 'test',
        limit: 10,
        scrapeResults: false,
      });

      // 通过行为验证：检查 fetch 调用的 URL
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:8080'),
        expect.any(Object),
      );
    });
  });
});
