/**
 * CrawlerProcessor unit tests
 *
 * [PROVIDES]: Terminal status safeguards and idempotency
 * [POS]: Crawl worker safeguards
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CrawlerProcessor } from '../crawler.processor';

describe('CrawlerProcessor', () => {
  let processor: CrawlerProcessor;
  let mockPrisma: any;
  let mockFrontier: any;
  let mockScraper: any;
  let mockWebhook: any;
  let mockBilling: any;
  let mockConfig: any;
  let mockQueue: any;

  beforeEach(() => {
    mockPrisma = {
      crawlJob: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      crawlPage: {
        count: vi.fn(),
      },
    };
    mockFrontier = {
      popBatch: vi.fn(),
      hasMore: vi.fn(),
      cleanup: vi.fn(),
    };
    mockScraper = {
      scrapeSync: vi.fn(),
    };
    mockWebhook = {
      send: vi.fn(),
    };
    mockBilling = {
      refundOnFailure: vi.fn(),
    };
    mockConfig = {
      get: vi.fn().mockReturnValue(undefined),
    };
    mockQueue = {
      add: vi.fn(),
    };

    processor = new CrawlerProcessor(
      mockPrisma as any,
      mockFrontier as any,
      mockScraper as any,
      mockWebhook as any,
      mockBilling as any,
      mockConfig as any,
      mockQueue as any,
    );
  });

  it('should skip crawl-batch when job already finalized', async () => {
    mockPrisma.crawlJob.findUnique.mockResolvedValue({
      id: 'crawl-1',
      status: 'COMPLETED',
    });

    await processor.process({
      name: 'crawl-batch',
      data: { crawlJobId: 'crawl-1' },
    } as any);

    expect(mockFrontier.popBatch).not.toHaveBeenCalled();
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('should skip crawl-check when job already finalized', async () => {
    mockPrisma.crawlJob.findUnique.mockResolvedValue({
      id: 'crawl-1',
      status: 'FAILED',
    });

    await processor.process({
      name: 'crawl-check',
      data: { crawlJobId: 'crawl-1' },
    } as any);

    expect(mockFrontier.hasMore).not.toHaveBeenCalled();
  });
});
