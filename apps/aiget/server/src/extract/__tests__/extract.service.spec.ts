/**
 * ExtractService 单元测试
 * 测试结构化数据提取逻辑
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ExtractService } from '../extract.service';
import type { ScraperService } from '../../scraper/scraper.service';
import type { LlmClient } from '../llm.client';
import type { ConfigService } from '@nestjs/config';
import type { BillingService } from '../../billing/billing.service';

describe('ExtractService', () => {
  let service: ExtractService;
  let mockScraperService: {
    scrapeSync: Mock;
  };
  let mockLlmClient: {
    complete: Mock;
    completeParsed: Mock;
  };
  let mockConfig: { get: Mock };
  let mockBillingService: { deductOrThrow: Mock; refundOnFailure: Mock };

  beforeEach(() => {
    mockScraperService = {
      scrapeSync: vi.fn().mockResolvedValue({
        markdown: '# Test Page\n\nSome content here.',
        metadata: { title: 'Test' },
      }),
    };

    mockLlmClient = {
      complete: vi.fn().mockResolvedValue('Extracted text content'),
      completeParsed: vi.fn().mockResolvedValue({
        name: 'Test Product',
        price: 99.99,
      }),
    };

    mockConfig = {
      get: vi.fn().mockReturnValue(5), // EXTRACT_CONCURRENCY
    };

    mockBillingService = {
      deductOrThrow: vi.fn().mockResolvedValue(null),
      refundOnFailure: vi.fn().mockResolvedValue({ success: true }),
    };

    service = new ExtractService(
      mockScraperService as unknown as ScraperService,
      mockLlmClient as unknown as LlmClient,
      mockConfig as unknown as ConfigService,
      mockBillingService as unknown as BillingService,
    );
  });

  // ============ 基本提取 ============

  describe('extract', () => {
    it('should scrape and extract from single URL', async () => {
      const result = await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract the main content',
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].url).toBe('https://example.com');
      expect(mockScraperService.scrapeSync).toHaveBeenCalledWith('user_1', {
        url: 'https://example.com',
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000,
        mobile: false,
        darkMode: false,
      });
    });

    it('should extract from multiple URLs', async () => {
      const result = await service.extract('user_1', {
        urls: ['https://example.com/page1', 'https://example.com/page2'],
        prompt: 'Extract content',
      });

      expect(result.results).toHaveLength(2);
      expect(mockScraperService.scrapeSync).toHaveBeenCalledTimes(2);
    });

    it('should use custom prompt', async () => {
      await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract product information',
      });

      expect(mockLlmClient.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('Extract product information'),
        }),
      );
    });

    it('should return text content when no schema provided', async () => {
      mockLlmClient.complete.mockResolvedValue('This is the extracted content');

      const result = await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract content',
      });

      expect(result.results[0].data).toEqual({
        content: 'This is the extracted content',
      });
    });
  });

  // ============ Schema 提取 ============

  describe('schema extraction', () => {
    it('should use completeParsed when schema provided', async () => {
      await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract product info',
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            price: { type: 'number' },
          },
          required: ['name', 'price'],
        },
      });

      expect(mockLlmClient.completeParsed).toHaveBeenCalled();
      expect(mockLlmClient.complete).not.toHaveBeenCalled();
    });

    it('should return structured data matching schema', async () => {
      mockLlmClient.completeParsed.mockResolvedValue({
        name: 'Widget',
        price: 49.99,
        description: 'A useful widget',
      });

      const result = await service.extract('user_1', {
        urls: ['https://example.com'],
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            price: { type: 'number' },
            description: { type: 'string' },
          },
        },
      });

      expect(result.results[0].data).toEqual({
        name: 'Widget',
        price: 49.99,
        description: 'A useful widget',
      });
    });

    it('should handle array schema', async () => {
      mockLlmClient.completeParsed.mockResolvedValue({
        products: [
          { name: 'Product 1', price: 10 },
          { name: 'Product 2', price: 20 },
        ],
      });

      const result = await service.extract('user_1', {
        urls: ['https://example.com'],
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  price: { type: 'number' },
                },
              },
            },
          },
        },
      });

      expect(result.results[0].data).toHaveProperty('products');
    });
  });

  // ============ 系统提示词 ============

  describe('system prompts', () => {
    it('should use custom system prompt', async () => {
      await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract data',
        systemPrompt: 'You are a helpful data extraction assistant.',
      });

      expect(mockLlmClient.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: 'You are a helpful data extraction assistant.',
        }),
      );
    });

    it('should use default system prompt for schema extraction', async () => {
      await service.extract('user_1', {
        urls: ['https://example.com'],
        schema: { type: 'object', properties: {} },
      });

      expect(mockLlmClient.completeParsed).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('data extraction'),
        }),
      );
    });

    it('should use default system prompt for text extraction', async () => {
      await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Analyze this page',
      });

      expect(mockLlmClient.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: expect.stringContaining('helpful assistant'),
        }),
      );
    });
  });

  // ============ 模型选择 ============

  describe('model selection', () => {
    it('should pass custom model to LLM client', async () => {
      await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract',
        model: 'gpt-4o',
      });

      expect(mockLlmClient.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
        }),
      );
    });
  });

  // ============ 并发处理 ============

  describe('concurrency', () => {
    it('should process URLs with concurrency limit', async () => {
      const urls = Array.from(
        { length: 10 },
        (_, i) => `https://example.com/page${i}`,
      );

      await service.extract('user_1', {
        urls,
        prompt: 'Extract',
      });

      expect(mockScraperService.scrapeSync).toHaveBeenCalledTimes(10);
    });

    it('should use configured concurrency', async () => {
      mockConfig.get.mockReturnValue(3);

      // Recreate service with new config
      const newService = new ExtractService(
        mockScraperService as unknown as ScraperService,
        mockLlmClient as unknown as LlmClient,
        mockConfig as unknown as ConfigService,
        mockBillingService as unknown as BillingService,
      );

      const urls = Array.from(
        { length: 6 },
        (_, i) => `https://example.com/page${i}`,
      );

      await newService.extract('user_1', {
        urls,
        prompt: 'Extract',
      });

      // All URLs should be processed
      expect(mockScraperService.scrapeSync).toHaveBeenCalledTimes(6);
    });
  });

  // ============ 错误处理 ============

  describe('error handling', () => {
    it('should return error for failed scrape', async () => {
      mockScraperService.scrapeSync.mockRejectedValue(
        new Error('Scrape failed'),
      );

      const result = await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract',
      });

      expect(result.results[0].error).toBe('Scrape failed');
      expect(result.results[0].data).toBeUndefined();
    });

    it('should return error for failed LLM extraction', async () => {
      mockLlmClient.complete.mockRejectedValue(new Error('LLM error'));

      const result = await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract',
      });

      expect(result.results[0].error).toBe('LLM error');
    });

    it('should continue processing other URLs on individual failure', async () => {
      mockScraperService.scrapeSync
        .mockResolvedValueOnce({ markdown: 'Content 1' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ markdown: 'Content 3' });

      const result = await service.extract('user_1', {
        urls: [
          'https://example.com/1',
          'https://example.com/2',
          'https://example.com/3',
        ],
        prompt: 'Extract',
      });

      expect(result.results).toHaveLength(3);
      expect(result.results[0].data).toBeDefined();
      expect(result.results[1].error).toBeDefined();
      expect(result.results[2].data).toBeDefined();
    });
  });

  // ============ Prompt 构建 ============

  describe('prompt building', () => {
    it('should include markdown content in prompt', async () => {
      mockScraperService.scrapeSync.mockResolvedValue({
        markdown: '# Page Title\n\nPage content here.',
      });

      await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract the title',
      });

      expect(mockLlmClient.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('# Page Title'),
        }),
      );
    });

    it('should include user prompt in final prompt', async () => {
      await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'What are the main products?',
      });

      expect(mockLlmClient.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining('What are the main products?'),
        }),
      );
    });

    it('should use default prompt when not provided', async () => {
      await service.extract('user_1', {
        urls: ['https://example.com'],
      });

      expect(mockLlmClient.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: expect.stringContaining(
            'Extract the relevant structured data',
          ),
        }),
      );
    });

    it('should handle empty markdown', async () => {
      mockScraperService.scrapeSync.mockResolvedValue({
        markdown: '',
      });

      await service.extract('user_1', {
        urls: ['https://example.com'],
        prompt: 'Extract data',
      });

      expect(mockLlmClient.complete).toHaveBeenCalled();
    });
  });
});
