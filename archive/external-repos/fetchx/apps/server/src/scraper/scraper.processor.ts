/**
 * [INPUT]: ScrapeJobData from BullMQ queue - URL, options, tier info
 * [OUTPUT]: ScrapeResult written to database, stored in job result
 * [POS]: BullMQ worker that executes actual scraping via browser pool
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { Page } from 'playwright';
import { PrismaService } from '../prisma/prisma.service';
import { BrowserPool } from '../browser/browser-pool';
import { SCRAPE_QUEUE } from '../queue/queue.constants';
import { PageConfigHandler } from './handlers/page-config.handler';
import { WaitStrategyHandler } from './handlers/wait-strategy.handler';
import {
  ScreenshotHandler,
  type ScreenshotHandlerResult,
} from './handlers/screenshot.handler';
import { PdfHandler, type PdfHandlerResult } from './handlers/pdf.handler';
import { ActionExecutorHandler } from './handlers/action-executor.handler';
import { MarkdownTransformer } from './transformers/markdown.transformer';
import { ReadabilityTransformer } from './transformers/readability.transformer';
import { MetadataTransformer } from './transformers/metadata.transformer';
import { LinksTransformer } from './transformers/links.transformer';
import { ScrapeErrorCode } from '../common/constants/error-codes';
import type { ScrapeOptions, ScrapeFormat } from './dto/scrape.dto';
import type { ScrapeJobData } from './scraper.types';

@Processor(SCRAPE_QUEUE)
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    private prisma: PrismaService,
    private browserPool: BrowserPool,
    // Handlers（单一职责）
    private pageConfigHandler: PageConfigHandler,
    private waitStrategyHandler: WaitStrategyHandler,
    private screenshotHandler: ScreenshotHandler,
    private pdfHandler: PdfHandler,
    private actionExecutorHandler: ActionExecutorHandler,
    // Transformers
    private markdownTransformer: MarkdownTransformer,
    private readabilityTransformer: ReadabilityTransformer,
    private metadataTransformer: MetadataTransformer,
    private linksTransformer: LinksTransformer,
  ) {
    super();
  }

  async process(job: Job<ScrapeJobData>) {
    const { jobId, url, options, tier } = job.data;
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    this.logger.debug(`Processing scrape job: ${jobId} for ${url}`);

    try {
      // 更新状态
      await this.prisma.scrapeJob.update({
        where: { id: jobId },
        data: { status: 'PROCESSING' },
      });

      // 1. 获取浏览器上下文
      const context = await this.browserPool.acquireContext();
      const page = await context.newPage();

      try {
        // 2. 配置页面
        await this.pageConfigHandler.configure(page, options);

        // 3. 访问页面
        const fetchStart = Date.now();
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: options.timeout,
        });
        timings.fetchMs = Date.now() - fetchStart;

        // 4. 执行 Actions（如果有）
        if (options.actions?.length) {
          await this.actionExecutorHandler.execute(page, options.actions);
        }

        // 5. 等待策略
        const renderStart = Date.now();
        await this.waitStrategyHandler.waitForPageReady(page, options);
        timings.renderMs = Date.now() - renderStart;

        // 6. 隐藏元素（如果需要截图或 PDF）
        const formats = options.formats || (['markdown'] as ScrapeFormat[]);
        if (
          options.excludeTags?.length &&
          (formats.includes('screenshot') || formats.includes('pdf'))
        ) {
          await this.waitStrategyHandler.hideElements(page, options.excludeTags);
        }

        // 7. 获取 HTML
        const rawHtml = await page.content();

        // 8. 内容转换
        const transformStart = Date.now();
        const result = await this.transformContent(page, rawHtml, url, options);
        timings.transformMs = Date.now() - transformStart;

        // 9. 截图处理
        let screenshotData: ScreenshotHandlerResult | null = null;
        if (formats.includes('screenshot')) {
          const screenshotStart = Date.now();
          screenshotData = await this.screenshotHandler.process(
            page,
            jobId,
            options,
            tier,
          );
          timings.screenshotMs = Date.now() - screenshotStart;
        }

        // 10. PDF 处理
        let pdfData: PdfHandlerResult | null = null;
        if (formats.includes('pdf')) {
          const pdfStart = Date.now();
          pdfData = await this.pdfHandler.process(page, jobId, options, tier);
          timings.pdfMs = Date.now() - pdfStart;
        }

        timings.totalMs = Date.now() - startTime;

        // 11. 保存结果
        await this.saveResult(jobId, result, screenshotData, pdfData, timings);

        this.logger.debug(`Scrape job completed: ${jobId}`);
        return result;
      } finally {
        // 确保资源释放（即使 page.close() 失败也要释放 context）
        await page.close().catch(() => {});
        await this.browserPool.releaseContext(context);
      }
    } catch (error) {
      await this.handleError(jobId, error, startTime);
      throw error;
    }
  }

  /**
   * 内容转换（根据 formats 生成结果）
   */
  private async transformContent(
    page: Page,
    rawHtml: string,
    url: string,
    options: ScrapeOptions,
  ): Promise<Record<string, unknown>> {
    const formats = options.formats || (['markdown'] as ScrapeFormat[]);
    const result: Record<string, unknown> = {};

    // 提取主内容 HTML
    let processedHtml = rawHtml;
    if (options.onlyMainContent) {
      processedHtml = await this.readabilityTransformer.extract(rawHtml, url, {
        includeTags: options.includeTags,
        excludeTags: options.excludeTags,
        baseUrl: url,
      });
    }

    // 并行处理各种格式
    const tasks: Promise<void>[] = [];

    if (formats.includes('rawHtml')) {
      result.rawHtml = rawHtml;
    }
    if (formats.includes('html')) {
      result.html = processedHtml;
    }
    if (formats.includes('markdown')) {
      tasks.push(
        this.markdownTransformer.convert(processedHtml, { baseUrl: url }).then((md) => {
          result.markdown = md;
        }),
      );
    }
    if (formats.includes('links')) {
      tasks.push(
        this.linksTransformer.extract(page, url).then((links) => {
          result.links = links;
        }),
      );
    }

    // 始终提取元数据
    tasks.push(
      this.metadataTransformer.extract(rawHtml, url).then((meta) => {
        result.metadata = meta;
      }),
    );

    await Promise.all(tasks);
    return result;
  }

  /**
   * 保存结果
   */
  private async saveResult(
    jobId: string,
    result: Record<string, unknown>,
    screenshotData: ScreenshotHandlerResult | null,
    pdfData: PdfHandlerResult | null,
    timings: Record<string, number>,
  ): Promise<void> {
    await this.prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        result: JSON.parse(JSON.stringify(result)),
        ...(screenshotData && {
          screenshotUrl: screenshotData.url,
          screenshotBase64: screenshotData.base64,
          screenshotWidth: screenshotData.width,
          screenshotHeight: screenshotData.height,
          screenshotFileSize: screenshotData.fileSize,
          screenshotFormat: screenshotData.format,
          screenshotExpiresAt: screenshotData.expiresAt,
          imageProcessMs: screenshotData.imageProcessMs,
          uploadMs: screenshotData.uploadMs,
        }),
        ...(pdfData && {
          pdfUrl: pdfData.url,
          pdfFileSize: pdfData.fileSize,
          pdfPageCount: pdfData.pageCount,
          pdfExpiresAt: pdfData.expiresAt,
        }),
        fetchMs: timings.fetchMs,
        renderMs: timings.renderMs,
        transformMs: timings.transformMs,
        screenshotMs: timings.screenshotMs,
        pdfMs: timings.pdfMs,
        totalMs: timings.totalMs,
        completedAt: new Date(),
      },
    });
  }

  /**
   * 错误处理（包含错误码）
   */
  private async handleError(
    jobId: string,
    error: unknown,
    startTime: number,
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = this.resolveErrorCode(error);

    this.logger.error(`Scrape job failed: ${jobId}`, errorMessage);

    await this.prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: errorMessage,
        errorCode,
        totalMs: Date.now() - startTime,
      },
    });
  }

  /**
   * 解析错误码
   */
  private resolveErrorCode(error: unknown): ScrapeErrorCode {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // 检查是否有预设的错误码
      if ((error as Error & { code?: ScrapeErrorCode }).code) {
        return (error as Error & { code: ScrapeErrorCode }).code;
      }

      // 根据错误信息推断错误码
      if (message.includes('timeout')) return ScrapeErrorCode.PAGE_TIMEOUT;
      if (message.includes('net::err')) return ScrapeErrorCode.NETWORK_ERROR;
      if (message.includes('404')) return ScrapeErrorCode.PAGE_NOT_FOUND;
      if (message.includes('403')) return ScrapeErrorCode.ACCESS_DENIED;
      if (message.includes('selector not found'))
        return ScrapeErrorCode.SELECTOR_NOT_FOUND;
    }

    return ScrapeErrorCode.BROWSER_ERROR;
  }
}
