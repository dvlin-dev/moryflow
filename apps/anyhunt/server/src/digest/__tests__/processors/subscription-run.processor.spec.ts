/**
 * Subscription Run Processor Tests
 *
 * [PROVIDES]: SubscriptionRunProcessor 单元测试
 * [POS]: 测试订阅运行核心执行流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionRunProcessor } from '../../processors/subscription-run.processor';
import { createMockPrisma } from '../mocks';

describe('SubscriptionRunProcessor', () => {
  let processor: SubscriptionRunProcessor;
  let mockPrisma: any;
  let mockSearchService: any;
  let mockScraperService: any;
  let mockRunService: any;
  let mockContentService: any;
  let mockAiService: any;
  let mockSourceService: any;
  let mockFeedbackService: any;
  let mockNotificationService: any;

  const mockSubscription = {
    id: 'sub-1',
    userId: 'user-1',
    topic: 'AI News',
    interests: ['machine learning', 'deep learning'],
    negativeInterests: [],
    searchLimit: 20,
    scrapeLimit: 10,
    minItems: 5,
    minScore: 30,
    redeliveryPolicy: 'NEVER',
    redeliveryCooldownDays: 7,
    contentWindowHours: 168,
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    mockSearchService = {
      search: vi.fn(),
    };

    mockScraperService = {
      scrape: vi.fn(),
    };

    mockRunService = {
      startRun: vi.fn(),
      createRunItem: vi.fn(),
      deliverItems: vi.fn(),
      completeRun: vi.fn(),
      failRun: vi.fn(),
    };

    mockContentService = {
      ingestContent: vi.fn(),
      getEnrichment: vi.fn(),
      createEnrichment: vi.fn(),
    };

    mockAiService = {
      generateSummary: vi.fn(),
      generateNarrative: vi.fn(),
    };

    mockSourceService = {
      fetchSourceContents: vi.fn(),
      mergeContents: vi.fn(),
    };

    mockFeedbackService = {
      getPatterns: vi.fn(),
    };

    mockNotificationService = {
      onRunCompleted: vi.fn(),
    };

    processor = new SubscriptionRunProcessor(
      mockPrisma as any,
      mockSearchService as any,
      mockScraperService as any,
      mockRunService as any,
      mockContentService as any,
      mockAiService as any,
      mockSourceService as any,
      mockFeedbackService as any,
      mockNotificationService as any,
    );
  });

  describe('process', () => {
    const mockJob = {
      data: {
        subscriptionId: 'sub-1',
        runId: 'run-1',
        userId: 'user-1',
        outputLocale: 'en',
      },
    };

    it('should complete a successful run', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [
          {
            url: 'https://example.com/1',
            title: 'AI Article',
            description: 'AI news',
          },
        ],
      });
      mockSourceService.fetchSourceContents.mockResolvedValue([]);
      mockSourceService.mergeContents.mockImplementation(
        (search: unknown[], source: unknown[]) => [
          ...search.map((s: any) => ({
            ...s,
            sourceType: 'search',
            weight: 100,
          })),
          ...source,
        ],
      );
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Article content',
        metadata: {},
      });
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockContentService.ingestContent.mockResolvedValue({
        id: 'content-1',
        canonicalUrlHash: 'hash-1',
      });
      mockContentService.getEnrichment.mockResolvedValue(null);
      mockAiService.generateSummary.mockResolvedValue({ result: 'AI summary' });
      mockContentService.createEnrichment.mockResolvedValue({
        aiSummary: 'AI summary',
      });
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([]);
      mockRunService.createRunItem.mockResolvedValue({ id: 'run-item-1' });
      mockAiService.generateNarrative.mockResolvedValue({
        result: 'Narrative',
        cost: 10,
      });

      const result = await processor.process(mockJob as any);

      expect(mockRunService.startRun).toHaveBeenCalledWith('run-1');
      expect(mockSearchService.search).toHaveBeenCalled();
      expect(mockRunService.completeRun).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({
          itemsCandidate: expect.any(Number),
          itemsSelected: expect.any(Number),
        }),
        expect.any(Object),
        expect.any(String),
      );
      expect(mockNotificationService.onRunCompleted).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        itemsDelivered: expect.any(Number),
      });
    });

    it('should fail run when subscription not found', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(null);

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'Subscription sub-1 not found',
      );

      expect(mockRunService.startRun).toHaveBeenCalledWith('run-1');
      expect(mockRunService.failRun).toHaveBeenCalledWith(
        'run-1',
        'Subscription sub-1 not found',
      );
    });

    it('should handle search failure', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockRejectedValue(new Error('Search failed'));

      await expect(processor.process(mockJob as any)).rejects.toThrow(
        'Search failed',
      );

      expect(mockRunService.failRun).toHaveBeenCalledWith(
        'run-1',
        'Search failed',
      );
    });

    it('should skip scraping when scrapeLimit is 0', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        scrapeLimit: 0,
      });
      mockSearchService.search.mockResolvedValue({ results: [] });
      mockSourceService.fetchSourceContents.mockResolvedValue([]);
      mockSourceService.mergeContents.mockReturnValue([]);
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([]);
      mockAiService.generateNarrative.mockResolvedValue({
        result: null,
        cost: 0,
      });

      await processor.process(mockJob as any);

      expect(mockScraperService.scrape).not.toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({ results: [] });
      mockSourceService.fetchSourceContents.mockResolvedValue([]);
      mockSourceService.mergeContents.mockReturnValue([]);
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([]);
      mockAiService.generateNarrative.mockResolvedValue({
        result: null,
        cost: 0,
      });

      const result = await processor.process(mockJob as any);

      expect(mockRunService.completeRun).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({
          itemsCandidate: 0,
          itemsSelected: 0,
          itemsDelivered: 0,
        }),
        expect.any(Object),
        undefined,
      );
      expect(result.itemsDelivered).toBe(0);
    });

    it('should merge search results with source contents', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [{ url: 'https://example.com/1', title: 'Search Result' }],
      });
      mockSourceService.fetchSourceContents.mockResolvedValue([
        { url: 'https://example.com/2', title: 'RSS Item', sourceType: 'rss' },
      ]);
      mockSourceService.mergeContents.mockImplementation(
        (search: unknown[], source: unknown[]) => [...search, ...source],
      );
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Content',
        metadata: {},
      });
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockContentService.ingestContent.mockResolvedValue({
        id: 'content-1',
        canonicalUrlHash: 'hash-1',
      });
      mockContentService.getEnrichment.mockResolvedValue({
        aiSummary: 'Summary',
      });
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([]);
      mockRunService.createRunItem.mockResolvedValue({ id: 'run-item-1' });
      mockAiService.generateNarrative.mockResolvedValue({
        result: 'Narrative',
        cost: 10,
      });

      await processor.process(mockJob as any);

      expect(mockSourceService.fetchSourceContents).toHaveBeenCalledWith(
        'sub-1',
        168,
      );
      expect(mockSourceService.mergeContents).toHaveBeenCalled();
    });

    it('should handle scraper failures gracefully', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({
        results: [
          { url: 'https://example.com/1', title: 'Article 1' },
          { url: 'https://example.com/2', title: 'Article 2' },
        ],
      });
      mockSourceService.fetchSourceContents.mockResolvedValue([]);
      mockSourceService.mergeContents.mockImplementation(
        (search: unknown[]) => search,
      );
      mockScraperService.scrape
        .mockResolvedValueOnce({ markdown: 'Content 1', metadata: {} })
        .mockRejectedValueOnce(new Error('Scrape failed'));
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockContentService.ingestContent.mockResolvedValue({
        id: 'content-1',
        canonicalUrlHash: 'hash-1',
      });
      mockContentService.getEnrichment.mockResolvedValue({
        aiSummary: 'Summary',
      });
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([]);
      mockRunService.createRunItem.mockResolvedValue({ id: 'run-item-1' });
      mockAiService.generateNarrative.mockResolvedValue({
        result: 'Narrative',
        cost: 10,
      });

      // Should complete without throwing
      const result = await processor.process(mockJob as any);
      expect(result.success).toBe(true);
    });

    it('should trigger notification on success', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({ results: [] });
      mockSourceService.fetchSourceContents.mockResolvedValue([]);
      mockSourceService.mergeContents.mockReturnValue([]);
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([]);
      mockAiService.generateNarrative.mockResolvedValue({
        result: null,
        cost: 0,
      });

      await processor.process(mockJob as any);

      expect(mockNotificationService.onRunCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-1',
          subscriptionId: 'sub-1',
          userId: 'user-1',
          status: 'completed',
        }),
      );
    });

    it('should trigger failure notification on error', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(null);

      await expect(processor.process(mockJob as any)).rejects.toThrow();

      expect(mockNotificationService.onRunCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          runId: 'run-1',
          status: 'failed',
          itemsDelivered: 0,
          error: expect.any(String),
        }),
      );
    });

    it('should update subscription lastRunAt', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockSearchService.search.mockResolvedValue({ results: [] });
      mockSourceService.fetchSourceContents.mockResolvedValue([]);
      mockSourceService.mergeContents.mockReturnValue([]);
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([]);
      mockAiService.generateNarrative.mockResolvedValue({
        result: null,
        cost: 0,
      });

      await processor.process(mockJob as any);

      expect(mockPrisma.digestSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { lastRunAt: expect.any(Date) },
      });
    });
  });

  describe('deduplication', () => {
    const mockJob = {
      data: {
        subscriptionId: 'sub-1',
        runId: 'run-1',
        userId: 'user-1',
        outputLocale: 'en',
      },
    };

    it('should skip already delivered items with NEVER policy', async () => {
      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        redeliveryPolicy: 'NEVER',
      });
      mockSearchService.search.mockResolvedValue({
        results: [{ url: 'https://example.com/1', title: 'Article' }],
      });
      mockSourceService.fetchSourceContents.mockResolvedValue([]);
      mockSourceService.mergeContents.mockImplementation(
        (search: unknown[]) => search,
      );
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Content',
        metadata: {},
      });
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockContentService.ingestContent.mockResolvedValue({
        id: 'content-1',
        canonicalUrlHash: 'hash-1',
      });
      mockContentService.getEnrichment.mockResolvedValue({
        aiSummary: 'Summary',
      });
      // Item was already delivered
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([
        { canonicalUrlHash: 'hash-1', _max: { deliveredAt: new Date() } },
      ]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([
        { id: 'content-1', contentHash: 'ch-1' },
      ]);
      mockAiService.generateNarrative.mockResolvedValue({
        result: null,
        cost: 0,
      });

      const result = await processor.process(mockJob as any);

      expect(mockRunService.completeRun).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({
          itemsDedupSkipped: 1,
        }),
        expect.any(Object),
        undefined,
      );
    });

    it('should redeliver with COOLDOWN policy after cooldown expires', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      mockPrisma.digestSubscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        redeliveryPolicy: 'COOLDOWN',
        redeliveryCooldownDays: 7,
      });
      mockSearchService.search.mockResolvedValue({
        results: [{ url: 'https://example.com/1', title: 'Article' }],
      });
      mockSourceService.fetchSourceContents.mockResolvedValue([]);
      mockSourceService.mergeContents.mockImplementation(
        (search: unknown[]) => search,
      );
      mockScraperService.scrape.mockResolvedValue({
        markdown: 'Content',
        metadata: {},
      });
      mockFeedbackService.getPatterns.mockResolvedValue([]);
      mockContentService.ingestContent.mockResolvedValue({
        id: 'content-1',
        canonicalUrlHash: 'hash-1',
      });
      mockContentService.getEnrichment.mockResolvedValue({
        aiSummary: 'Summary',
      });
      mockPrisma.digestRunItem.groupBy.mockResolvedValue([
        { canonicalUrlHash: 'hash-1', _max: { deliveredAt: oldDate } },
      ]);
      mockPrisma.userContentState.findMany.mockResolvedValue([]);
      mockPrisma.contentItem.findMany.mockResolvedValue([
        { id: 'content-1', contentHash: 'ch-1' },
      ]);
      mockRunService.createRunItem.mockResolvedValue({ id: 'run-item-1' });
      mockAiService.generateNarrative.mockResolvedValue({
        result: 'Narrative',
        cost: 10,
      });

      const result = await processor.process(mockJob as any);

      expect(mockRunService.completeRun).toHaveBeenCalledWith(
        'run-1',
        expect.objectContaining({
          itemsRedelivered: 1,
        }),
        expect.any(Object),
        expect.any(String),
      );
    });
  });
});
