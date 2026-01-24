/**
 * BatchScrapeService 单元测试
 *
 * 测试批量抓取服务的核心功能：
 * - 批量任务创建（同步/异步模式）
 * - SSRF 防护
 * - 任务状态查询
 * - 历史记录查询
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { BatchScrapeService } from '../batch-scrape.service';
import { BatchJobNotFoundError } from '../batch-scrape.errors';

// Mock 类型定义
type MockPrismaService = {
  batchScrapeJob: {
    create: Mock;
    findUnique: Mock;
    findMany: Mock;
    update: Mock;
    delete: Mock;
  };
  batchScrapeItem: {
    createMany: Mock;
    findMany: Mock;
  };
};

type MockUrlValidator = {
  isAllowed: Mock;
};

type MockQueue = {
  add: Mock;
  getJob: Mock;
};

type MockBillingService = {
  deductOrThrow: Mock;
  refundOnFailure: Mock;
};

// Mock QueueEvents
vi.mock('../queue', () => ({
  BATCH_SCRAPE_QUEUE: 'batch-scrape',
  createQueueEvents: vi.fn(() => ({})),
}));

describe('BatchScrapeService', () => {
  let service: BatchScrapeService;
  let mockPrisma: MockPrismaService;
  let mockUrlValidator: MockUrlValidator;
  let mockQueue: MockQueue;
  let mockBillingService: MockBillingService;

  const mockBatchJob = {
    id: 'batch-1',
    userId: 'user-1',
    status: 'PENDING',
    totalUrls: 2,
    completedUrls: 0,
    failedUrls: 0,
    webhookUrl: null,
    options: {},
    quotaDeducted: false,
    createdAt: new Date('2024-01-01'),
    completedAt: null,
  };

  const mockBatchItems = [
    {
      id: 'item-1',
      batchJobId: 'batch-1',
      url: 'https://example.com/1',
      order: 0,
      status: 'COMPLETED',
      result: { markdown: 'Content 1' },
      error: null,
    },
    {
      id: 'item-2',
      batchJobId: 'batch-1',
      url: 'https://example.com/2',
      order: 1,
      status: 'COMPLETED',
      result: { markdown: 'Content 2' },
      error: null,
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      batchScrapeJob: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      batchScrapeItem: {
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
    };

    mockUrlValidator = {
      isAllowed: vi.fn(),
    };

    mockQueue = {
      add: vi.fn(),
      getJob: vi.fn(),
    };

    mockBillingService = {
      deductOrThrow: vi.fn(),
      refundOnFailure: vi.fn(),
    };

    const mockConfigService = {
      get: vi.fn(),
    };

    service = new BatchScrapeService(
      mockPrisma as any,
      mockUrlValidator as any,
      mockQueue as any,
      mockBillingService as any,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('batchScrape', () => {
    describe('SSRF protection', () => {
      it('should reject disallowed URLs', async () => {
        mockUrlValidator.isAllowed
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false);

        await expect(
          service.batchScrape('user-1', {
            urls: ['https://example.com', 'http://localhost/internal'],
            sync: false,
            timeout: 30000,
          }),
        ).rejects.toThrow('SSRF protection');

        expect(mockPrisma.batchScrapeJob.create).not.toHaveBeenCalled();
      });

      it('should reject disallowed webhook URL', async () => {
        mockUrlValidator.isAllowed
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(false);

        await expect(
          service.batchScrape('user-1', {
            urls: ['https://example.com'],
            webhookUrl: 'http://localhost:3000/webhook',
            sync: false,
            timeout: 30000,
          }),
        ).rejects.toThrow('Webhook URL is not allowed (SSRF protection)');

        expect(mockPrisma.batchScrapeJob.create).not.toHaveBeenCalled();
      });

      it('should allow valid URLs', async () => {
        mockUrlValidator.isAllowed.mockResolvedValue(true);
        mockPrisma.batchScrapeJob.create.mockResolvedValue(mockBatchJob);
        mockPrisma.batchScrapeItem.createMany.mockResolvedValue({ count: 2 });
        mockBillingService.deductOrThrow.mockResolvedValue(null);
        mockQueue.add.mockResolvedValue({});

        // 使用 sync=false 避免等待任务完成
        const result = await service.batchScrape('user-1', {
          urls: ['https://example.com/1', 'https://example.com/2'],
          sync: false,
          timeout: 30000,
        });

        expect(mockUrlValidator.isAllowed).toHaveBeenCalledTimes(2);
        expect(result).toMatchObject({ id: 'batch-1', status: 'PENDING' });
      });
    });

    describe('async mode (sync=false)', () => {
      it('should return job ID immediately', async () => {
        mockUrlValidator.isAllowed.mockResolvedValue(true);
        mockPrisma.batchScrapeJob.create.mockResolvedValue(mockBatchJob);
        mockPrisma.batchScrapeItem.createMany.mockResolvedValue({ count: 2 });
        mockBillingService.deductOrThrow.mockResolvedValue(null);
        mockQueue.add.mockResolvedValue({});

        const result = await service.batchScrape('user-1', {
          urls: ['https://example.com/1', 'https://example.com/2'],
          sync: false,
          timeout: 30000,
        });

        expect(result).toEqual({
          id: 'batch-1',
          status: 'PENDING',
          totalUrls: 2,
        });
      });
    });

    describe('billing integration', () => {
      it('should deduct billing after job creation', async () => {
        mockUrlValidator.isAllowed.mockResolvedValue(true);
        mockPrisma.batchScrapeJob.create.mockResolvedValue(mockBatchJob);
        mockPrisma.batchScrapeItem.createMany.mockResolvedValue({ count: 2 });
        mockBillingService.deductOrThrow.mockResolvedValue({
          deduct: {
            success: true,
            breakdown: [
              {
                source: 'MONTHLY',
                amount: 2,
                transactionId: 'tx-1',
                balanceBefore: 100,
                balanceAfter: 98,
              },
            ],
          },
          amount: 2,
        });
        mockQueue.add.mockResolvedValue({});

        await service.batchScrape('user-1', {
          urls: ['https://example.com/1', 'https://example.com/2'],
          sync: false,
          timeout: 30000,
        });

        expect(mockBillingService.deductOrThrow).toHaveBeenCalledWith({
          userId: 'user-1',
          billingKey: 'fetchx.batchScrape',
          referenceId: 'batch-1',
        });

        expect(mockPrisma.batchScrapeJob.update).toHaveBeenCalledWith({
          where: { id: 'batch-1' },
          data: {
            quotaDeducted: true,
            quotaSource: 'MONTHLY',
            quotaAmount: 2,
            quotaTransactionId: 'tx-1',
            quotaBreakdown: [
              {
                source: 'MONTHLY',
                amount: 2,
                transactionId: 'tx-1',
                balanceBefore: 100,
                balanceAfter: 98,
              },
            ],
            billingKey: 'fetchx.batchScrape',
          },
        });
      });

      it('should refund and cleanup on queue failure', async () => {
        mockUrlValidator.isAllowed.mockResolvedValue(true);
        mockPrisma.batchScrapeJob.create.mockResolvedValue(mockBatchJob);
        mockPrisma.batchScrapeItem.createMany.mockResolvedValue({ count: 2 });
        mockBillingService.deductOrThrow.mockResolvedValue({
          deduct: {
            success: true,
            breakdown: [
              {
                source: 'MONTHLY',
                amount: 2,
                transactionId: 'tx-1',
                balanceBefore: 100,
                balanceAfter: 98,
              },
            ],
          },
          amount: 2,
        });
        mockQueue.add.mockRejectedValue(new Error('Queue error'));
        mockPrisma.batchScrapeJob.delete.mockResolvedValue(undefined);

        await expect(
          service.batchScrape('user-1', {
            urls: ['https://example.com'],
            sync: false,
            timeout: 30000,
          }),
        ).rejects.toThrow('Queue error');

        expect(mockBillingService.refundOnFailure).toHaveBeenCalledWith({
          userId: 'user-1',
          billingKey: 'fetchx.batchScrape',
          referenceId: 'batch-1',
          breakdown: [
            {
              source: 'MONTHLY',
              amount: 2,
              transactionId: 'tx-1',
              balanceBefore: 100,
              balanceAfter: 98,
            },
          ],
        });
        expect(mockPrisma.batchScrapeJob.delete).toHaveBeenCalledWith({
          where: { id: 'batch-1' },
        });
      });
    });

    describe('job creation', () => {
      it('should create batch job and items', async () => {
        mockUrlValidator.isAllowed.mockResolvedValue(true);
        mockPrisma.batchScrapeJob.create.mockResolvedValue(mockBatchJob);
        mockPrisma.batchScrapeItem.createMany.mockResolvedValue({ count: 2 });
        mockBillingService.deductOrThrow.mockResolvedValue(null);
        mockQueue.add.mockResolvedValue({});

        await service.batchScrape('user-1', {
          urls: ['https://example.com/1', 'https://example.com/2'],
          scrapeOptions: { formats: ['markdown'] } as any,
          webhookUrl: 'https://webhook.example.com',
          sync: false,
          timeout: 30000,
        });

        expect(mockPrisma.batchScrapeJob.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            status: 'PENDING',
            totalUrls: 2,
            webhookUrl: 'https://webhook.example.com',
            options: { formats: ['markdown'] },
          },
        });

        expect(mockPrisma.batchScrapeItem.createMany).toHaveBeenCalledWith({
          data: [
            {
              batchJobId: 'batch-1',
              url: 'https://example.com/1',
              order: 0,
              status: 'PENDING',
            },
            {
              batchJobId: 'batch-1',
              url: 'https://example.com/2',
              order: 1,
              status: 'PENDING',
            },
          ],
        });
      });

      it('should queue batch-start job', async () => {
        mockUrlValidator.isAllowed.mockResolvedValue(true);
        mockPrisma.batchScrapeJob.create.mockResolvedValue(mockBatchJob);
        mockPrisma.batchScrapeItem.createMany.mockResolvedValue({ count: 2 });
        mockBillingService.deductOrThrow.mockResolvedValue(null);
        mockQueue.add.mockResolvedValue({});

        await service.batchScrape('user-1', {
          urls: ['https://example.com/1'],
          scrapeOptions: { timeout: 30000 } as any,
          sync: false,
          timeout: 30000,
        });

        expect(mockQueue.add).toHaveBeenCalledWith(
          'batch-start',
          {
            batchJobId: 'batch-1',
            options: { timeout: 30000 },
          },
          { jobId: 'batch-1' },
        );
      });
    });
  });

  describe('getStatus', () => {
    it('should return null for non-existent job', async () => {
      mockPrisma.batchScrapeJob.findUnique.mockResolvedValue(null);

      const result = await service.getStatus('non-existent');

      expect(result).toBeNull();
    });

    it('should return basic status for pending job', async () => {
      mockPrisma.batchScrapeJob.findUnique.mockResolvedValue(mockBatchJob);

      const result = await service.getStatus('batch-1');

      expect(result).toMatchObject({
        id: 'batch-1',
        status: 'PENDING',
        totalUrls: 2,
        completedUrls: 0,
        failedUrls: 0,
      });
      expect(result?.data).toBeUndefined();
      expect(mockPrisma.batchScrapeItem.findMany).not.toHaveBeenCalled();
    });

    it('should return full data for completed job', async () => {
      const completedJob = {
        ...mockBatchJob,
        status: 'COMPLETED',
        completedUrls: 2,
        completedAt: new Date('2024-01-01T01:00:00'),
      };
      mockPrisma.batchScrapeJob.findUnique.mockResolvedValue(completedJob);
      mockPrisma.batchScrapeItem.findMany.mockResolvedValue(mockBatchItems);

      const result = await service.getStatus('batch-1');

      expect(result?.status).toBe('COMPLETED');
      expect(result?.data).toHaveLength(2);
      expect(result?.data?.[0]).toMatchObject({
        url: 'https://example.com/1',
        status: 'COMPLETED',
        result: { markdown: 'Content 1' },
      });
    });

    it('should return full data for failed job', async () => {
      const failedJob = {
        ...mockBatchJob,
        status: 'FAILED',
        failedUrls: 1,
      };
      mockPrisma.batchScrapeJob.findUnique.mockResolvedValue(failedJob);
      mockPrisma.batchScrapeItem.findMany.mockResolvedValue([
        { ...mockBatchItems[0] },
        {
          ...mockBatchItems[1],
          status: 'FAILED',
          result: null,
          error: 'Timeout',
        },
      ]);

      const result = await service.getStatus('batch-1');

      expect(result?.status).toBe('FAILED');
      expect(result?.data?.[1]).toMatchObject({
        url: 'https://example.com/2',
        status: 'FAILED',
        error: 'Timeout',
      });
    });
  });

  describe('getHistory', () => {
    it('should return user batch history with pagination', async () => {
      const historyItems = [
        {
          id: 'batch-1',
          status: 'COMPLETED',
          totalUrls: 2,
          completedUrls: 2,
          failedUrls: 0,
          createdAt: new Date(),
          completedAt: new Date(),
        },
        {
          id: 'batch-2',
          status: 'PENDING',
          totalUrls: 5,
          completedUrls: 0,
          failedUrls: 0,
          createdAt: new Date(),
          completedAt: null,
        },
      ];
      mockPrisma.batchScrapeJob.findMany.mockResolvedValue(historyItems);

      const result = await service.getHistory('user-1', 10, 0);

      expect(mockPrisma.batchScrapeJob.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
        select: {
          id: true,
          status: true,
          totalUrls: true,
          completedUrls: true,
          failedUrls: true,
          createdAt: true,
          completedAt: true,
        },
      });
      expect(result).toHaveLength(2);
    });

    it('should use default pagination values', async () => {
      mockPrisma.batchScrapeJob.findMany.mockResolvedValue([]);

      await service.getHistory('user-1');

      expect(mockPrisma.batchScrapeJob.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
        select: expect.any(Object),
      });
    });
  });
});
