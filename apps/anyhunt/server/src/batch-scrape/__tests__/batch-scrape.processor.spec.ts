/**
 * BatchScrapeProcessor unit tests
 *
 * [PROVIDES]: Idempotent progress and retry safety
 * [POS]: BatchScrape worker behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchScrapeProcessor } from '../batch-scrape.processor';

describe('BatchScrapeProcessor', () => {
  let processor: BatchScrapeProcessor;
  let mockPrisma: any;
  let mockScraperService: any;
  let mockWebhookService: any;
  let mockBillingService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      batchScrapeJob: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({
          id: 'batch-1',
          userId: 'user-1',
          totalUrls: 3,
          status: 'COMPLETED',
          quotaDeducted: false,
          billingKey: null,
          quotaBreakdown: null,
          webhookUrl: null,
        }),
      },
      batchScrapeItem: {
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    mockScraperService = {
      scrapeSync: vi.fn().mockResolvedValue({ markdown: 'OK' }),
    };

    mockWebhookService = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    mockBillingService = {
      refundOnFailure: vi.fn().mockResolvedValue({ success: true }),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue(5),
    };

    processor = new BatchScrapeProcessor(
      mockPrisma as any,
      mockScraperService as any,
      mockWebhookService as any,
      mockBillingService as any,
      mockConfigService as any,
    );
  });

  it('should skip when batch already finalized', async () => {
    mockPrisma.batchScrapeJob.findUnique.mockResolvedValue({
      id: 'batch-1',
      status: 'COMPLETED',
    });

    await processor.process({
      data: { batchJobId: 'batch-1', options: {} },
    } as any);

    expect(mockPrisma.batchScrapeItem.findMany).not.toHaveBeenCalled();
    expect(mockScraperService.scrapeSync).not.toHaveBeenCalled();
  });

  it('should process pending items and finalize counts', async () => {
    mockPrisma.batchScrapeJob.findUnique.mockResolvedValue({
      id: 'batch-1',
      userId: 'user-1',
      totalUrls: 3,
      status: 'PENDING',
      webhookUrl: null,
      quotaDeducted: false,
      billingKey: null,
      quotaBreakdown: null,
    });

    mockPrisma.batchScrapeItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        url: 'https://example.com/1',
        order: 0,
        status: 'PENDING',
      },
      {
        id: 'item-2',
        url: 'https://example.com/2',
        order: 1,
        status: 'PENDING',
      },
    ]);

    mockPrisma.batchScrapeItem.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    await processor.process({
      data: { batchJobId: 'batch-1', options: {} },
    } as any);

    expect(mockScraperService.scrapeSync).toHaveBeenCalledTimes(2);
    expect(mockPrisma.batchScrapeJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedUrls: 3,
          failedUrls: 0,
        }),
      }),
    );
  });
});
