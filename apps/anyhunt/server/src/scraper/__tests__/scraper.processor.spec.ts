/**
 * ScraperProcessor 单元测试
 * 测试 BullMQ 处理器逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScraperProcessor } from '../scraper.processor';
import type { PrismaService } from '../../prisma/prisma.service';
import type { BrowserPool } from '../../browser/browser-pool';
import type { BillingService } from '../../billing/billing.service';
import type { PageConfigHandler } from '../handlers/page-config.handler';
import type { WaitStrategyHandler } from '../handlers/wait-strategy.handler';
import type { ScreenshotHandler } from '../handlers/screenshot.handler';
import type { PdfHandler } from '../handlers/pdf.handler';
import type { ActionExecutorHandler } from '../handlers/action-executor.handler';
import type { MarkdownTransformer } from '../transformers/markdown.transformer';
import type { ReadabilityTransformer } from '../transformers/readability.transformer';
import type { MetadataTransformer } from '../transformers/metadata.transformer';
import type { LinksTransformer } from '../transformers/links.transformer';
import type { Job } from 'bullmq';
import { ScrapeErrorCode } from '../../common/constants/error-codes';

// Helper type for mock call
type MockUpdateCall = [
  { where: { id: string }; data: Record<string, unknown> },
];

// Helper function to find update call by status
const findUpdateCallByStatus = (
  calls: MockUpdateCall[],
  status: string,
): MockUpdateCall | undefined => {
  return calls.find((call) => call[0].data.status === status);
};

describe('ScraperProcessor', () => {
  let processor: ScraperProcessor;
  let mockPrisma: {
    scrapeJob: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let mockBrowserPool: {
    acquireContext: ReturnType<typeof vi.fn>;
    releaseContext: ReturnType<typeof vi.fn>;
  };
  let mockBillingService: { refundOnFailure: ReturnType<typeof vi.fn> };
  let mockPageConfigHandler: { configure: ReturnType<typeof vi.fn> };
  let mockWaitStrategyHandler: {
    waitForPageReady: ReturnType<typeof vi.fn>;
    hideElements: ReturnType<typeof vi.fn>;
  };
  let mockScreenshotHandler: { process: ReturnType<typeof vi.fn> };
  let mockPdfHandler: { process: ReturnType<typeof vi.fn> };
  let mockActionExecutorHandler: { execute: ReturnType<typeof vi.fn> };
  let mockMarkdownTransformer: { convert: ReturnType<typeof vi.fn> };
  let mockReadabilityTransformer: { extract: ReturnType<typeof vi.fn> };
  let mockMetadataTransformer: { extract: ReturnType<typeof vi.fn> };
  let mockLinksTransformer: { extract: ReturnType<typeof vi.fn> };
  let mockPage: {
    goto: ReturnType<typeof vi.fn>;
    content: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let mockContext: {
    newPage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      content: vi.fn().mockResolvedValue('<html><body>Test</body></html>'),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
    };

    mockPrisma = {
      scrapeJob: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    mockBrowserPool = {
      acquireContext: vi.fn().mockResolvedValue(mockContext),
      releaseContext: vi.fn().mockResolvedValue(undefined),
    };

    mockBillingService = {
      refundOnFailure: vi.fn().mockResolvedValue({ success: true }),
    };

    mockPageConfigHandler = {
      configure: vi.fn().mockResolvedValue(undefined),
    };

    mockWaitStrategyHandler = {
      waitForPageReady: vi.fn().mockResolvedValue(undefined),
      hideElements: vi.fn().mockResolvedValue(undefined),
    };

    mockScreenshotHandler = {
      process: vi.fn().mockResolvedValue({
        url: 'https://cdn.example.com/screenshot.png',
        base64: null,
        width: 1920,
        height: 1080,
        fileSize: 50000,
        format: 'png',
        expiresAt: new Date(),
        imageProcessMs: 100,
        uploadMs: 200,
      }),
    };

    mockPdfHandler = {
      process: vi.fn().mockResolvedValue({
        url: 'https://cdn.example.com/document.pdf',
        base64: null,
        fileSize: 100000,
        pageCount: 5,
        expiresAt: new Date(),
      }),
    };

    mockActionExecutorHandler = {
      execute: vi.fn().mockResolvedValue(undefined),
    };

    mockMarkdownTransformer = {
      convert: vi.fn().mockResolvedValue('# Test Markdown'),
    };

    mockReadabilityTransformer = {
      extract: vi.fn().mockResolvedValue('<article>Main content</article>'),
    };

    mockMetadataTransformer = {
      extract: vi.fn().mockResolvedValue({
        title: 'Test Page',
        description: 'Test description',
      }),
    };

    mockLinksTransformer = {
      extract: vi
        .fn()
        .mockResolvedValue([
          { url: 'https://example.com/page1', text: 'Page 1' },
        ]),
    };

    processor = new ScraperProcessor(
      mockPrisma as unknown as PrismaService,
      mockBrowserPool as unknown as BrowserPool,
      mockBillingService as unknown as BillingService,
      mockPageConfigHandler as unknown as PageConfigHandler,
      mockWaitStrategyHandler as unknown as WaitStrategyHandler,
      mockScreenshotHandler as unknown as ScreenshotHandler,
      mockPdfHandler as unknown as PdfHandler,
      mockActionExecutorHandler as unknown as ActionExecutorHandler,
      mockMarkdownTransformer as unknown as MarkdownTransformer,
      mockReadabilityTransformer as unknown as ReadabilityTransformer,
      mockMetadataTransformer as unknown as MetadataTransformer,
      mockLinksTransformer as unknown as LinksTransformer,
    );
  });

  const createMockJob = (overrides = {}): Job =>
    ({
      data: {
        jobId: 'job_1',
        url: 'https://example.com',
        options: {
          formats: ['markdown'],
          timeout: 30000,
        },
        tier: 'FREE',
        ...overrides,
      },
      id: 'queue_job_1',
    }) as unknown as Job;

  // ============ 基本流程 ============

  describe('process', () => {
    it('should update job status to PROCESSING', async () => {
      const job = createMockJob();

      await processor.process(job);

      expect(mockPrisma.scrapeJob.update).toHaveBeenCalledWith({
        where: { id: 'job_1' },
        data: { status: 'PROCESSING' },
      });
    });

    it('should acquire browser context', async () => {
      const job = createMockJob();

      await processor.process(job);

      expect(mockBrowserPool.acquireContext).toHaveBeenCalled();
    });

    it('should configure page with options', async () => {
      const job = createMockJob();

      await processor.process(job);

      expect(mockPageConfigHandler.configure).toHaveBeenCalledWith(
        mockPage,
        expect.objectContaining({ timeout: 30000 }),
      );
    });

    it('should navigate to URL', async () => {
      const job = createMockJob();

      await processor.process(job);

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    });

    it('should wait for page ready', async () => {
      const job = createMockJob();

      await processor.process(job);

      expect(mockWaitStrategyHandler.waitForPageReady).toHaveBeenCalledWith(
        mockPage,
        expect.any(Object),
      );
    });

    it('should extract metadata', async () => {
      const job = createMockJob();

      await processor.process(job);

      expect(mockMetadataTransformer.extract).toHaveBeenCalled();
    });

    it('should save completed result', async () => {
      const job = createMockJob();

      await processor.process(job);

      const completedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'COMPLETED',
      );

      expect(completedCall).toBeDefined();
      expect(completedCall![0].data).toMatchObject({
        status: 'COMPLETED',
        completedAt: expect.any(Date),
      });
    });

    it('should release browser context on success', async () => {
      const job = createMockJob();

      await processor.process(job);

      expect(mockBrowserPool.releaseContext).toHaveBeenCalledWith(mockContext);
    });

    it('should close page on success', async () => {
      const job = createMockJob();

      await processor.process(job);

      expect(mockPage.close).toHaveBeenCalled();
    });
  });

  // ============ 格式处理 ============

  describe('format handling', () => {
    it('should convert to markdown when format requested', async () => {
      const job = createMockJob({
        options: { formats: ['markdown'] },
      });

      const result = await processor.process(job);

      expect(mockMarkdownTransformer.convert).toHaveBeenCalled();
      expect(result).toHaveProperty('markdown');
    });

    it('should include raw HTML when format requested', async () => {
      const job = createMockJob({
        options: { formats: ['rawHtml'] },
      });

      const result = await processor.process(job);

      expect(result).toHaveProperty('rawHtml');
    });

    it('should extract links when format requested', async () => {
      const job = createMockJob({
        options: { formats: ['links'] },
      });

      const result = await processor.process(job);

      expect(mockLinksTransformer.extract).toHaveBeenCalled();
      expect(result).toHaveProperty('links');
    });

    it('should take screenshot when format requested', async () => {
      const job = createMockJob({
        options: { formats: ['screenshot'] },
      });

      await processor.process(job);

      expect(mockScreenshotHandler.process).toHaveBeenCalledWith(
        mockPage,
        'job_1',
        expect.any(Object),
        'FREE',
      );
    });

    it('should not take screenshot when not requested', async () => {
      const job = createMockJob({
        options: { formats: ['markdown'] },
      });

      await processor.process(job);

      expect(mockScreenshotHandler.process).not.toHaveBeenCalled();
    });

    it('should default to markdown format', async () => {
      const job = createMockJob({
        options: {}, // No formats specified
      });

      await processor.process(job);

      expect(mockMarkdownTransformer.convert).toHaveBeenCalled();
    });
  });

  // ============ 主内容提取 ============

  describe('main content extraction', () => {
    it('should extract main content when onlyMainContent is true', async () => {
      const job = createMockJob({
        options: { formats: ['markdown'], onlyMainContent: true },
      });

      await processor.process(job);

      expect(mockReadabilityTransformer.extract).toHaveBeenCalled();
    });

    it('should not extract main content when onlyMainContent is false', async () => {
      const job = createMockJob({
        options: { formats: ['markdown'], onlyMainContent: false },
      });

      await processor.process(job);

      expect(mockReadabilityTransformer.extract).not.toHaveBeenCalled();
    });
  });

  // ============ Actions 执行 ============

  describe('actions execution', () => {
    it('should execute actions when provided', async () => {
      const actions = [
        { type: 'click', selector: '#button' },
        { type: 'wait', milliseconds: 1000 },
      ];
      const job = createMockJob({
        options: { formats: ['markdown'], actions },
      });

      await processor.process(job);

      expect(mockActionExecutorHandler.execute).toHaveBeenCalledWith(
        mockPage,
        actions,
      );
    });

    it('should not call action executor when no actions', async () => {
      const job = createMockJob({
        options: { formats: ['markdown'] },
      });

      await processor.process(job);

      expect(mockActionExecutorHandler.execute).not.toHaveBeenCalled();
    });
  });

  // ============ 元素隐藏 ============

  describe('element hiding', () => {
    it('should hide excluded elements for screenshots', async () => {
      const job = createMockJob({
        options: {
          formats: ['screenshot'],
          excludeTags: ['.ads', '#popup'],
        },
      });

      await processor.process(job);

      expect(mockWaitStrategyHandler.hideElements).toHaveBeenCalledWith(
        mockPage,
        ['.ads', '#popup'],
      );
    });

    it('should not hide elements when no excludeTags', async () => {
      const job = createMockJob({
        options: { formats: ['screenshot'] },
      });

      await processor.process(job);

      expect(mockWaitStrategyHandler.hideElements).not.toHaveBeenCalled();
    });

    it('should not hide elements for non-screenshot formats', async () => {
      const job = createMockJob({
        options: {
          formats: ['markdown'],
          excludeTags: ['.ads'],
        },
      });

      await processor.process(job);

      expect(mockWaitStrategyHandler.hideElements).not.toHaveBeenCalled();
    });
  });

  // ============ 错误处理 ============

  describe('error handling', () => {
    it('should update job with FAILED status on error', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow('Navigation failed');

      const failedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'FAILED',
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0].data).toMatchObject({
        status: 'FAILED',
        error: 'Navigation failed',
      });
    });

    it('should release browser context on error', async () => {
      mockPage.goto.mockRejectedValue(new Error('Test error'));

      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow();

      expect(mockBrowserPool.releaseContext).toHaveBeenCalled();
    });

    it('should close page on error', async () => {
      mockPage.goto.mockRejectedValue(new Error('Test error'));

      const job = createMockJob();

      await expect(processor.process(job)).rejects.toThrow();

      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle page close failure gracefully', async () => {
      mockPage.close.mockRejectedValue(new Error('Close failed'));

      const job = createMockJob();

      // Should not throw even if page.close fails
      await processor.process(job);

      expect(mockBrowserPool.releaseContext).toHaveBeenCalled();
    });
  });

  // ============ 错误码解析 ============

  describe('error code resolution', () => {
    it('should set PAGE_TIMEOUT for timeout errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));

      const job = createMockJob();
      await expect(processor.process(job)).rejects.toThrow();

      const failedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'FAILED',
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0].data.errorCode).toBe(ScrapeErrorCode.PAGE_TIMEOUT);
    });

    it('should set NETWORK_ERROR for network errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('net::err_connection_refused'));

      const job = createMockJob();
      await expect(processor.process(job)).rejects.toThrow();

      const failedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'FAILED',
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0].data.errorCode).toBe(ScrapeErrorCode.NETWORK_ERROR);
    });

    it('should set PAGE_NOT_FOUND for 404 errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('404 Not Found'));

      const job = createMockJob();
      await expect(processor.process(job)).rejects.toThrow();

      const failedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'FAILED',
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0].data.errorCode).toBe(
        ScrapeErrorCode.PAGE_NOT_FOUND,
      );
    });

    it('should set ACCESS_DENIED for 403 errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('403 Forbidden'));

      const job = createMockJob();
      await expect(processor.process(job)).rejects.toThrow();

      const failedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'FAILED',
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0].data.errorCode).toBe(ScrapeErrorCode.ACCESS_DENIED);
    });

    it('should set BROWSER_ERROR for unknown errors', async () => {
      mockPage.goto.mockRejectedValue(new Error('Unknown browser error'));

      const job = createMockJob();
      await expect(processor.process(job)).rejects.toThrow();

      const failedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'FAILED',
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0].data.errorCode).toBe(ScrapeErrorCode.BROWSER_ERROR);
    });

    it('should use error code from error object if present', async () => {
      const errorWithCode = new Error('Custom error') as Error & {
        code: ScrapeErrorCode;
      };
      errorWithCode.code = ScrapeErrorCode.SELECTOR_NOT_FOUND;
      mockPage.goto.mockRejectedValue(errorWithCode);

      const job = createMockJob();
      await expect(processor.process(job)).rejects.toThrow();

      const failedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'FAILED',
      );

      expect(failedCall).toBeDefined();
      expect(failedCall![0].data.errorCode).toBe(
        ScrapeErrorCode.SELECTOR_NOT_FOUND,
      );
    });
  });

  // ============ 时间记录 ============

  describe('timing records', () => {
    it('should record timing information', async () => {
      const job = createMockJob();

      await processor.process(job);

      const completedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'COMPLETED',
      );

      expect(completedCall).toBeDefined();
      expect(completedCall![0].data).toMatchObject({
        fetchMs: expect.any(Number),
        renderMs: expect.any(Number),
        transformMs: expect.any(Number),
        totalMs: expect.any(Number),
      });
    });

    it('should record screenshot timing when screenshot taken', async () => {
      const job = createMockJob({
        options: { formats: ['screenshot'] },
      });

      await processor.process(job);

      const completedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'COMPLETED',
      );

      expect(completedCall).toBeDefined();
      expect(completedCall![0].data).toHaveProperty('screenshotMs');
    });
  });

  // ============ 截图结果保存 ============

  describe('screenshot result saving', () => {
    it('should save screenshot metadata', async () => {
      const job = createMockJob({
        options: { formats: ['screenshot'] },
      });

      await processor.process(job);

      const completedCall = findUpdateCallByStatus(
        mockPrisma.scrapeJob.update.mock.calls as MockUpdateCall[],
        'COMPLETED',
      );

      expect(completedCall).toBeDefined();
      expect(completedCall![0].data).toMatchObject({
        screenshotUrl: 'https://cdn.example.com/screenshot.png',
        screenshotWidth: 1920,
        screenshotHeight: 1080,
        screenshotFileSize: 50000,
        screenshotFormat: 'png',
        screenshotExpiresAt: expect.any(Date),
        imageProcessMs: 100,
        uploadMs: 200,
      });
    });
  });
});
