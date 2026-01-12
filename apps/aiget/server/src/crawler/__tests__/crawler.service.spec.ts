/**
 * CrawlerService 单元测试
 * 测试爬虫任务管理逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrawlerService } from '../crawler.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { UrlValidator } from '../../common/validators/url.validator';
import type { Queue } from 'bullmq';
import type { BillingService } from '../../billing/billing.service';
import type { ConfigService } from '@nestjs/config';

describe('CrawlerService', () => {
  let service: CrawlerService;
  let mockPrisma: {
    crawlJob: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    crawlPage: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockUrlValidator: {
    isAllowed: ReturnType<typeof vi.fn>;
  };
  let mockQueue: {
    add: ReturnType<typeof vi.fn>;
  };
  let mockBillingService: {
    deductOrThrow: ReturnType<typeof vi.fn>;
    refundOnFailure: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      crawlJob: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      crawlPage: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockUrlValidator = {
      isAllowed: vi.fn().mockReturnValue(true),
    };

    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'queue_job_1' }),
    };

    mockBillingService = {
      deductOrThrow: vi.fn().mockResolvedValue(null),
      refundOnFailure: vi.fn().mockResolvedValue({ success: true }),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('redis://localhost:6379'),
    };

    service = new CrawlerService(
      mockPrisma as unknown as PrismaService,
      mockUrlValidator as unknown as UrlValidator,
      mockQueue as unknown as Queue,
      mockBillingService as unknown as BillingService,
      mockConfigService as unknown as ConfigService,
    );
  });

  // ============ 启动爬取 ============

  describe('startCrawl', () => {
    const mockOptions = {
      url: 'https://example.com',
      maxDepth: 3,
      limit: 100,
      allowExternalLinks: false,
      sync: false, // 测试异步模式，避免等待 QueueEvents
      timeout: 300000,
    };

    it('should create crawl job with correct data', async () => {
      mockPrisma.crawlJob.create.mockResolvedValue({ id: 'crawl_1' });

      await service.startCrawl('user_1', mockOptions);

      expect(mockPrisma.crawlJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          startUrl: 'https://example.com',
          status: 'PENDING',
        }),
      });
    });

    it('should create starting crawl page', async () => {
      mockPrisma.crawlJob.create.mockResolvedValue({ id: 'crawl_1' });

      await service.startCrawl('user_1', mockOptions);

      expect(mockPrisma.crawlPage.create).toHaveBeenCalledWith({
        data: {
          crawlJobId: 'crawl_1',
          url: 'https://example.com',
          depth: 0,
          status: 'PENDING',
        },
      });
    });

    it('should add job to queue', async () => {
      mockPrisma.crawlJob.create.mockResolvedValue({ id: 'crawl_1' });

      await service.startCrawl('user_1', mockOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'crawl-start',
        { crawlJobId: 'crawl_1' },
        { jobId: 'crawl_1' },
      );
    });

    it('should return created job', async () => {
      const mockJob = { id: 'crawl_1', status: 'PENDING' };
      mockPrisma.crawlJob.create.mockResolvedValue(mockJob);

      const result = await service.startCrawl('user_1', mockOptions);

      expect(result).toEqual(mockJob);
    });

    // SSRF 防护测试
    describe('SSRF protection', () => {
      it('should throw for blocked URLs', async () => {
        mockUrlValidator.isAllowed.mockReturnValue(false);

        await expect(
          service.startCrawl('user_1', {
            url: 'http://169.254.169.254/metadata',
            maxDepth: 3,
            limit: 100,
            allowExternalLinks: false,
            sync: false,
            timeout: 300000,
          }),
        ).rejects.toThrow('URL not allowed');
      });

      it('should throw for localhost', async () => {
        mockUrlValidator.isAllowed.mockReturnValue(false);

        await expect(
          service.startCrawl('user_1', {
            url: 'http://localhost:3000',
            maxDepth: 3,
            limit: 100,
            allowExternalLinks: false,
            sync: false,
            timeout: 300000,
          }),
        ).rejects.toThrow('SSRF');
      });

      it('should throw for private IP', async () => {
        mockUrlValidator.isAllowed.mockReturnValue(false);

        await expect(
          service.startCrawl('user_1', {
            url: 'http://192.168.1.1',
            maxDepth: 3,
            limit: 100,
            allowExternalLinks: false,
            sync: false,
            timeout: 300000,
          }),
        ).rejects.toThrow('SSRF');
      });
    });

    // 选项处理测试
    describe('options handling', () => {
      it('should use default values when options not provided', async () => {
        mockPrisma.crawlJob.create.mockResolvedValue({ id: 'crawl_1' });

        await service.startCrawl('user_1', {
          url: 'https://example.com',
          maxDepth: 3,
          limit: 100,
          allowExternalLinks: false,
          sync: false,
          timeout: 300000,
        });

        expect(mockPrisma.crawlJob.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            options: expect.objectContaining({
              maxDepth: 3,
              limit: 100,
              includePaths: [],
              excludePaths: [],
              allowExternalLinks: false,
            }),
          }),
        });
      });

      it('should pass custom options', async () => {
        mockPrisma.crawlJob.create.mockResolvedValue({ id: 'crawl_1' });

        await service.startCrawl('user_1', {
          url: 'https://example.com',
          maxDepth: 5,
          limit: 50,
          includePaths: ['/blog/*'],
          excludePaths: ['/admin/*'],
          allowExternalLinks: true,
          sync: false,
          timeout: 300000,
        });

        expect(mockPrisma.crawlJob.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            options: expect.objectContaining({
              maxDepth: 5,
              limit: 50,
              includePaths: ['/blog/*'],
              excludePaths: ['/admin/*'],
              allowExternalLinks: true,
            }),
          }),
        });
      });

      it('should store webhook URL', async () => {
        mockPrisma.crawlJob.create.mockResolvedValue({ id: 'crawl_1' });

        await service.startCrawl('user_1', {
          url: 'https://example.com',
          maxDepth: 3,
          limit: 100,
          allowExternalLinks: false,
          webhookUrl: 'https://webhook.example.com/callback',
          sync: false,
          timeout: 300000,
        });

        expect(mockPrisma.crawlJob.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            webhookUrl: 'https://webhook.example.com/callback',
          }),
        });
      });
    });
  });

  // ============ 获取状态 ============

  describe('getStatus', () => {
    it('should return null for non-existent job', async () => {
      mockPrisma.crawlJob.findUnique.mockResolvedValue(null);

      const result = await service.getStatus('non_existent');

      expect(result).toBeNull();
    });

    it('should return status for pending job', async () => {
      mockPrisma.crawlJob.findUnique.mockResolvedValue({
        id: 'crawl_1',
        status: 'PENDING',
        startUrl: 'https://example.com',
        totalUrls: 0,
        completedUrls: 0,
        failedUrls: 0,
        createdAt: new Date('2024-01-01'),
        startedAt: null,
        completedAt: null,
      });

      const result = await service.getStatus('crawl_1');

      expect(result).toEqual({
        id: 'crawl_1',
        status: 'PENDING',
        startUrl: 'https://example.com',
        totalUrls: 0,
        completedUrls: 0,
        failedUrls: 0,
        createdAt: expect.any(Date),
        startedAt: undefined,
        completedAt: undefined,
      });
    });

    it('should return status for processing job', async () => {
      mockPrisma.crawlJob.findUnique.mockResolvedValue({
        id: 'crawl_1',
        status: 'PROCESSING',
        startUrl: 'https://example.com',
        totalUrls: 50,
        completedUrls: 25,
        failedUrls: 2,
        createdAt: new Date('2024-01-01'),
        startedAt: new Date('2024-01-01T00:01:00'),
        completedAt: null,
      });

      const result = await service.getStatus('crawl_1');

      expect(result).toEqual({
        id: 'crawl_1',
        status: 'PROCESSING',
        startUrl: 'https://example.com',
        totalUrls: 50,
        completedUrls: 25,
        failedUrls: 2,
        createdAt: expect.any(Date),
        startedAt: expect.any(Date),
        completedAt: undefined,
      });
    });

    it('should include page data for completed job', async () => {
      mockPrisma.crawlJob.findUnique.mockResolvedValue({
        id: 'crawl_1',
        status: 'COMPLETED',
        startUrl: 'https://example.com',
        totalUrls: 10,
        completedUrls: 10,
        failedUrls: 0,
        createdAt: new Date('2024-01-01'),
        startedAt: new Date('2024-01-01T00:01:00'),
        completedAt: new Date('2024-01-01T00:05:00'),
      });

      mockPrisma.crawlPage.findMany.mockResolvedValue([
        { url: 'https://example.com', depth: 0, result: { markdown: 'Home' } },
        {
          url: 'https://example.com/about',
          depth: 1,
          result: { markdown: 'About' },
        },
      ]);

      const result = await service.getStatus('crawl_1');

      expect(result?.data).toEqual([
        { url: 'https://example.com', depth: 0, markdown: 'Home' },
        { url: 'https://example.com/about', depth: 1, markdown: 'About' },
      ]);
    });

    it('should not fetch pages for incomplete job', async () => {
      mockPrisma.crawlJob.findUnique.mockResolvedValue({
        id: 'crawl_1',
        status: 'PROCESSING',
        startUrl: 'https://example.com',
        totalUrls: 10,
        completedUrls: 5,
        failedUrls: 0,
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: null,
      });

      await service.getStatus('crawl_1');

      expect(mockPrisma.crawlPage.findMany).not.toHaveBeenCalled();
    });
  });

  // ============ 取消爬取 ============

  describe('cancelCrawl', () => {
    it('should update job status to CANCELLED', async () => {
      await service.cancelCrawl('crawl_1');

      expect(mockPrisma.crawlJob.update).toHaveBeenCalledWith({
        where: { id: 'crawl_1' },
        data: { status: 'CANCELLED' },
      });
    });
  });

  // ============ 获取历史 ============

  describe('getHistory', () => {
    it('should return user crawl history with default pagination', async () => {
      mockPrisma.crawlJob.findMany.mockResolvedValue([
        { id: 'crawl_1', startUrl: 'https://example.com', status: 'COMPLETED' },
        { id: 'crawl_2', startUrl: 'https://other.com', status: 'FAILED' },
      ]);

      const result = await service.getHistory('user_1');

      expect(mockPrisma.crawlJob.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        select: expect.objectContaining({
          id: true,
          startUrl: true,
          status: true,
        }),
      });
      expect(result).toHaveLength(2);
    });

    it('should use custom pagination', async () => {
      mockPrisma.crawlJob.findMany.mockResolvedValue([]);

      await service.getHistory('user_1', 10, 5);

      expect(mockPrisma.crawlJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 5,
        }),
      );
    });

    it('should select correct fields', async () => {
      mockPrisma.crawlJob.findMany.mockResolvedValue([]);

      await service.getHistory('user_1');

      expect(mockPrisma.crawlJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            startUrl: true,
            status: true,
            totalUrls: true,
            completedUrls: true,
            failedUrls: true,
            createdAt: true,
            completedAt: true,
          },
        }),
      );
    });
  });
});
