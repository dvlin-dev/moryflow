/**
 * ScraperService 单元测试
 * 测试网页抓取业务逻辑
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ScraperService } from '../scraper.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ConfigService } from '@nestjs/config';
import type { UrlValidator } from '../../common/validators/url.validator';
import type { Queue } from 'bullmq';
import type { ScrapeOptions } from '../dto/scrape.dto';
import type { BillingService } from '../../billing/billing.service';

// 共享的有效选项（用于所有测试）
// 使用 sync: false 避免在测试中等待 QueueEvents
const validOptions: ScrapeOptions = {
  url: 'https://example.com',
  formats: ['markdown'],
  onlyMainContent: true,
  timeout: 30000,
  mobile: false,
  darkMode: false,
  sync: false,
  syncTimeout: 120000,
};

describe('ScraperService', () => {
  let service: ScraperService;
  let mockPrisma: {
    scrapeJob: {
      findFirst: Mock;
      findUnique: Mock;
      findMany: Mock;
      create: Mock;
    };
    user: {
      findUnique: Mock;
    };
  };
  let mockUrlValidator: {
    isAllowed: Mock;
  };
  let mockQueue: {
    add: Mock;
    getJob: Mock;
  };
  let mockConfig: {
    get: Mock;
  };
  let mockBillingService: { deductOrThrow: Mock; refundOnFailure: Mock };

  beforeEach(() => {
    mockPrisma = {
      scrapeJob: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };
    mockUrlValidator = {
      isAllowed: vi.fn().mockResolvedValue(true),
    };
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'queue_job_1' }),
      getJob: vi.fn().mockResolvedValue(null),
    };
    mockConfig = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        if (key === 'SCRAPE_CACHE_TTL_MS') return 3600000;
        return undefined;
      }),
    };

    mockBillingService = {
      deductOrThrow: vi.fn().mockResolvedValue(null),
      refundOnFailure: vi.fn().mockResolvedValue({ success: true }),
    };

    service = new ScraperService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
      mockUrlValidator as unknown as UrlValidator,
      mockQueue as unknown as Queue,
      mockBillingService as unknown as BillingService,
    );
  });

  // ============ scrape ============

  describe('scrape', () => {
    it('should throw error for SSRF attempt', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(false);

      await expect(
        service.scrape('user_1', {
          ...validOptions,
          url: 'http://169.254.169.254',
        }),
      ).rejects.toThrow('SSRF protection');
    });

    it('should return cached result when available', async () => {
      const cached = {
        id: 'job_cached',
        url: 'https://example.com',
        status: 'COMPLETED',
        result: { markdown: 'cached content' },
      };
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(cached);

      const result = await service.scrape('user_1', validOptions);

      // 缓存命中时返回 ScrapeResult
      expect('fromCache' in result && result.fromCache).toBe(true);
      expect(result.id).toBe('job_cached');
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should create job and add to queue when not cached', async () => {
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        url: 'https://example.com',
        status: 'PENDING',
      });

      const result = await service.scrape('user_1', validOptions);

      expect(result.id).toBe('job_new');
      // 异步模式（sync: false）返回 { id, status }
      expect('status' in result && result.status).toBe('PENDING');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape',
        expect.objectContaining({
          jobId: 'job_new',
          userId: 'user_1',
          url: 'https://example.com',
          tier: 'FREE',
        }),
        expect.objectContaining({
          jobId: 'job_new',
          attempts: 3,
        }),
      );
    });

    it('should not persist request headers in job options', async () => {
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        url: 'https://example.com',
        status: 'PENDING',
      });

      await service.scrape('user_1', {
        ...validOptions,
        headers: { Authorization: 'Bearer secret-token' },
      });

      const createCall = mockPrisma.scrapeJob.create.mock.calls[0][0];
      const storedOptions = createCall.data.options as Record<string, unknown>;
      expect(storedOptions.headers).toBeUndefined();
    });

    it('should use user tier for job', async () => {
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'PRO', status: 'ACTIVE' },
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        status: 'PENDING',
      });

      await service.scrape('user_1', validOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape',
        expect.objectContaining({
          tier: 'PRO',
        }),
        expect.any(Object),
      );
    });

    it('should default to FREE tier when user has no subscription', async () => {
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: null,
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        status: 'PENDING',
      });

      await service.scrape('user_1', validOptions);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'scrape',
        expect.objectContaining({
          tier: 'FREE',
        }),
        expect.any(Object),
      );
    });

    it('should store apiKeyId when provided', async () => {
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        status: 'PENDING',
      });

      await service.scrape('user_1', validOptions, 'apikey_123');

      expect(mockPrisma.scrapeJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          apiKeyId: 'apikey_123',
        }),
      });
    });

    it('should compute consistent hash for same options', async () => {
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        status: 'PENDING',
      });

      await service.scrape('user_1', validOptions);
      await service.scrape('user_2', validOptions);

      // Both calls should search for the same requestHash
      const calls = mockPrisma.scrapeJob.findFirst.mock.calls;
      expect(calls[0][0].where.requestHash).toBe(calls[1][0].where.requestHash);
    });
  });

  // ============ getStatus ============

  describe('getStatus', () => {
    it('should return job status', async () => {
      const job = {
        id: 'job_1',
        status: 'COMPLETED',
        result: { markdown: 'content' },
      };
      mockPrisma.scrapeJob.findUnique.mockResolvedValue(job);

      const result = await service.getStatus('job_1');

      expect(result).toEqual(job);
      expect(mockPrisma.scrapeJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job_1' },
      });
    });

    it('should return null when job not found', async () => {
      mockPrisma.scrapeJob.findUnique.mockResolvedValue(null);

      const result = await service.getStatus('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ============ getHistory ============

  describe('getHistory', () => {
    it('should return user scrape history', async () => {
      const jobs = [
        { id: 'job_1', url: 'https://example.com' },
        { id: 'job_2', url: 'https://test.com' },
      ];
      mockPrisma.scrapeJob.findMany.mockResolvedValue(jobs);

      const result = await service.getHistory('user_1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.scrapeJob.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      mockPrisma.scrapeJob.findMany.mockResolvedValue([]);

      await service.getHistory('user_1', 10, 20);

      expect(mockPrisma.scrapeJob.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });
  });

  // ============ URL validation integration ============

  describe('URL validation', () => {
    it('should validate URL before processing', async () => {
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        status: 'PENDING',
      });

      await service.scrape('user_1', {
        ...validOptions,
        url: 'https://valid.example.com',
      });

      expect(mockUrlValidator.isAllowed).toHaveBeenCalledWith(
        'https://valid.example.com',
      );
    });

    it('should reject various SSRF attack vectors', async () => {
      mockUrlValidator.isAllowed.mockResolvedValue(false);

      const ssrfUrls = [
        'http://localhost',
        'http://127.0.0.1',
        'http://169.254.169.254',
        'http://10.0.0.1',
        'http://192.168.1.1',
      ];

      for (const url of ssrfUrls) {
        await expect(
          service.scrape('user_1', { ...validOptions, url }),
        ).rejects.toThrow('SSRF protection');
      }
    });
  });

  // ============ Cache behavior ============

  describe('cache behavior', () => {
    it('should only use cache within TTL', async () => {
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        status: 'PENDING',
      });

      await service.scrape('user_1', {
        ...validOptions,
        url: 'https://example.com',
      });

      // Check that cache query includes TTL constraint
      expect(mockPrisma.scrapeJob.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'COMPLETED',
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      });
    });

    it('should not cache non-COMPLETED jobs', async () => {
      // Return a PENDING job - should not be treated as cached
      mockPrisma.scrapeJob.findFirst.mockResolvedValue(null); // Query only looks for COMPLETED
      mockPrisma.user.findUnique.mockResolvedValue({
        subscription: { tier: 'FREE', status: 'ACTIVE' },
      });
      mockPrisma.scrapeJob.create.mockResolvedValue({
        id: 'job_new',
        status: 'PENDING',
      });

      const result = await service.scrape('user_1', {
        ...validOptions,
        url: 'https://example.com',
      });

      // 异步模式（sync: false）缓存未命中时返回 { id, status }，无 fromCache 属性
      expect('fromCache' in result).toBe(false);
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
