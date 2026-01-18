/**
 * [INPUT]: CrawlJobData from BullMQ queue - crawlJobId, batch processing state
 * [OUTPUT]: void - updates CrawlJob/CrawlPage and triggers webhook on completion
 * [POS]: BullMQ worker for Crawl API（按批次抓取页面并聚合结果）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma-main/client';
import { UrlFrontier } from './url-frontier';
import { ScraperService } from '../scraper/scraper.service';
import { WebhookService } from '../common/services/webhook.service';
import { BillingService } from '../billing/billing.service';
import { BILLING_KEYS, type BillingKey } from '../billing/billing.rules';
import { parseQuotaBreakdown } from '../billing/quota-breakdown.utils';
import { CRAWL_QUEUE } from '../queue/queue.constants';
import type { CrawlJobData, FrontierOptions } from './crawler.types';

/** 默认批量大小 */
const DEFAULT_BATCH_SIZE = 10;
const BILLING_KEY_SET = new Set<string>(BILLING_KEYS);

@Processor(CRAWL_QUEUE)
export class CrawlerProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlerProcessor.name);
  private readonly batchSize: number;

  constructor(
    private prisma: PrismaService,
    private urlFrontier: UrlFrontier,
    private scraperService: ScraperService,
    private webhookService: WebhookService,
    private billingService: BillingService,
    private config: ConfigService,
    @InjectQueue(CRAWL_QUEUE) private crawlQueue: Queue,
  ) {
    super();
    this.batchSize = config.get('CRAWL_BATCH_SIZE') || DEFAULT_BATCH_SIZE;
  }

  async process(job: Job<CrawlJobData>) {
    switch (job.name) {
      case 'crawl-start':
        return this.handleCrawlStart(job.data);
      case 'crawl-batch':
        return this.handleCrawlBatch(job.data);
      case 'crawl-check':
        return this.handleCrawlCheck(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * 开始爬取
   */
  private async handleCrawlStart(data: CrawlJobData): Promise<void> {
    const { crawlJobId } = data;

    const crawlJob = await this.prisma.crawlJob.update({
      where: { id: crawlJobId },
      data: {
        status: 'CRAWLING',
        startedAt: new Date(),
        totalUrls: 1,
      },
    });

    const options = crawlJob.options as Record<string, unknown>;
    const baseHost = new URL(crawlJob.startUrl).hostname;

    const frontierOptions: FrontierOptions = {
      crawlJobId,
      maxDepth: (options.maxDepth as number) || 3,
      limit: (options.limit as number) || 100,
      includePaths: (options.includePaths as string[]) || [],
      excludePaths: (options.excludePaths as string[]) || [],
      allowExternalLinks: (options.allowExternalLinks as boolean) || false,
      baseHost,
    };

    // 初始化 URL Frontier
    await this.urlFrontier.addUrls(
      [{ url: crawlJob.startUrl, depth: 0 }],
      frontierOptions,
    );

    // 启动批量爬取
    await this.crawlQueue.add('crawl-batch', { crawlJobId });

    this.logger.debug(`Crawl started: ${crawlJobId}`);
  }

  /**
   * 批量并行爬取
   */
  private async handleCrawlBatch(data: CrawlJobData): Promise<void> {
    const { crawlJobId } = data;

    // 检查任务状态
    const crawlJob = await this.prisma.crawlJob.findUnique({
      where: { id: crawlJobId },
    });

    if (!crawlJob || crawlJob.status === 'CANCELLED') {
      return;
    }

    // 批量获取 URL
    const batch = await this.urlFrontier.popBatch(crawlJobId, this.batchSize);

    if (batch.length === 0) {
      // 没有更多 URL，检查是否完成
      await this.crawlQueue.add('crawl-check', { crawlJobId });
      return;
    }

    const options = crawlJob.options as Record<string, unknown>;
    const baseHost = new URL(crawlJob.startUrl).hostname;

    const frontierOptions: FrontierOptions = {
      crawlJobId,
      maxDepth: (options.maxDepth as number) || 3,
      limit: (options.limit as number) || 100,
      includePaths: (options.includePaths as string[]) || [],
      excludePaths: (options.excludePaths as string[]) || [],
      allowExternalLinks: (options.allowExternalLinks as boolean) || false,
      baseHost,
    };

    // 并行处理批量 URL
    const results = await Promise.allSettled(
      batch.map((item) =>
        this.processUrl(
          crawlJobId,
          crawlJob.userId,
          item,
          options,
          frontierOptions,
        ),
      ),
    );

    // 统计结果
    let completed = 0;
    let failed = 0;
    let newUrlsAdded = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        completed++;
        newUrlsAdded += result.value.addedCount;
      } else {
        failed++;
        this.logger.warn(`Crawl failed: ${result.reason}`);
      }
    }

    // 更新任务进度
    await this.prisma.crawlJob.update({
      where: { id: crawlJobId },
      data: {
        completedUrls: { increment: completed },
        failedUrls: { increment: failed },
        totalUrls: { increment: newUrlsAdded },
      },
    });

    // 继续处理下一批
    await this.crawlQueue.add('crawl-batch', { crawlJobId });
  }

  /**
   * 处理单个 URL
   */
  private async processUrl(
    crawlJobId: string,
    userId: string,
    item: { url: string; depth: number },
    options: Record<string, unknown>,
    frontierOptions: FrontierOptions,
  ): Promise<{ addedCount: number }> {
    const { url, depth } = item;

    // 创建/更新页面记录
    const page = await this.prisma.crawlPage.upsert({
      where: { crawlJobId_url: { crawlJobId, url } },
      create: { crawlJobId, url, depth, status: 'PROCESSING' },
      update: { status: 'PROCESSING' },
    });

    try {
      // 使用 ScraperService 抓取页面
      const scrapeOptions =
        (options.scrapeOptions as Record<string, unknown>) || {};
      const scrapeResult = await this.scraperService.scrapeSync(userId, {
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: true,
        timeout: 15000,
        mobile: false,
        darkMode: false,
        ...scrapeOptions,
      });

      // 提取链接并添加到队列
      const links = scrapeResult.links || [];
      const newUrls = links.map((link) => ({ url: link, depth: depth + 1 }));

      const addedCount = await this.urlFrontier.addUrls(
        newUrls,
        frontierOptions,
      );

      // 更新页面状态
      await this.prisma.crawlPage.update({
        where: { id: page.id },
        data: {
          status: 'COMPLETED',
          result: JSON.parse(
            JSON.stringify(scrapeResult),
          ) as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      return { addedCount };
    } catch (error) {
      // 记录错误
      await this.prisma.crawlPage.update({
        where: { id: page.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  /**
   * 检查爬取是否完成
   */
  private async handleCrawlCheck(data: CrawlJobData): Promise<void> {
    const { crawlJobId } = data;

    // 检查是否有正在处理的页面
    const processingCount = await this.prisma.crawlPage.count({
      where: { crawlJobId, status: 'PROCESSING' },
    });

    const hasMore = await this.urlFrontier.hasMore(crawlJobId);

    if (hasMore || processingCount > 0) {
      // 还有 URL 或正在处理，继续爬取
      await this.crawlQueue.add('crawl-batch', { crawlJobId });
    } else {
      const snapshot = await this.prisma.crawlJob.findUnique({
        where: { id: crawlJobId },
        select: {
          completedUrls: true,
          failedUrls: true,
        },
      });

      const finalStatus =
        snapshot && snapshot.completedUrls === 0 && snapshot.failedUrls > 0
          ? 'FAILED'
          : 'COMPLETED';

      // 完成爬取（全失败则标记 FAILED）
      const crawlJob = await this.prisma.crawlJob.update({
        where: { id: crawlJobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
        },
      });

      // 清理 Redis
      await this.urlFrontier.cleanup(crawlJobId);

      // 全失败：失败退款（幂等）
      const breakdown = parseQuotaBreakdown(crawlJob.quotaBreakdown);

      if (
        crawlJob.status === 'FAILED' &&
        crawlJob.quotaDeducted &&
        breakdown &&
        crawlJob.billingKey &&
        BILLING_KEY_SET.has(crawlJob.billingKey)
      ) {
        await this.billingService.refundOnFailure({
          userId: crawlJob.userId,
          billingKey: crawlJob.billingKey as BillingKey,
          referenceId: crawlJob.id,
          breakdown,
        });
      }

      // 触发 Webhook
      if (crawlJob.webhookUrl) {
        await this.triggerWebhook(crawlJobId);
      }

      this.logger.log(`Crawl completed: ${crawlJobId}`);
    }
  }

  /**
   * 触发 Webhook 回调
   */
  private async triggerWebhook(crawlJobId: string): Promise<void> {
    const crawlJob = await this.prisma.crawlJob.findUnique({
      where: { id: crawlJobId },
      include: {
        pages: {
          where: { status: 'COMPLETED' },
          select: { url: true, depth: true, result: true },
        },
      },
    });

    if (!crawlJob?.webhookUrl) return;

    await this.webhookService.send(crawlJob.webhookUrl, {
      event: 'crawl.completed',
      data: {
        id: crawlJob.id,
        status: crawlJob.status,
        totalUrls: crawlJob.totalUrls,
        completedUrls: crawlJob.completedUrls,
        failedUrls: crawlJob.failedUrls,
        pages: crawlJob.pages,
      },
    });
  }
}
