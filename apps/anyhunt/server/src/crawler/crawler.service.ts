/**
 * [INPUT]: CrawlOptions - URL, depth limit, page limit, filters, sync mode
 * [OUTPUT]: CrawlStatus (sync) | { id, status } (async)
 * [POS]: Crawl job orchestrator, manages URL frontier and page queue
 *
 * [PROTOCOL]: When this file changes, update this header and src/crawler/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, type QueueEvents } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma-main/client';
import { UrlValidator } from '../common/validators/url.validator';
import { CRAWL_QUEUE, createQueueEvents } from '../queue';
import { BillingService } from '../billing/billing.service';
import type { CrawlOptions } from './dto/crawl.dto';
import type { CrawlStatus, CrawlPageResult } from './crawler.types';
import { CrawlJobNotFoundError, CrawlFailedError } from './crawler.errors';
import { DEFAULT_CRAWL_TIMEOUT } from './crawler.constants';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly queueEvents: QueueEvents;

  constructor(
    private prisma: PrismaService,
    private urlValidator: UrlValidator,
    @InjectQueue(CRAWL_QUEUE) private crawlQueue: Queue,
    private billingService: BillingService,
    config: ConfigService,
  ) {
    // 用于等待任务完成
    this.queueEvents = createQueueEvents(CRAWL_QUEUE, config);
  }

  /**
   * 启动爬取任务
   * - sync=true（默认）：等待任务完成后返回完整结果
   * - sync=false：立即返回任务 ID，客户端轮询获取结果
   */
  async startCrawl(
    userId: string,
    options: CrawlOptions,
  ): Promise<CrawlStatus | { id: string; status: string }> {
    // SSRF 防护
    if (!(await this.urlValidator.isAllowed(options.url))) {
      throw new Error('URL not allowed: possible SSRF attack');
    }

    if (
      options.webhookUrl &&
      !(await this.urlValidator.isAllowed(options.webhookUrl))
    ) {
      throw new Error(`Webhook URL not allowed: ${options.webhookUrl}`);
    }

    // 创建 CrawlJob
    const job = await this.prisma.crawlJob.create({
      data: {
        userId,
        startUrl: options.url,
        status: 'PENDING',
        webhookUrl: options.webhookUrl,
        options: JSON.parse(
          JSON.stringify({
            maxDepth: options.maxDepth || 3,
            limit: options.limit || 100,
            includePaths: options.includePaths || [],
            excludePaths: options.excludePaths || [],
            allowExternalLinks: options.allowExternalLinks || false,
            scrapeOptions: options.scrapeOptions || {},
            webhookUrl: options.webhookUrl,
          }),
        ) as Prisma.InputJsonValue,
      },
    });

    const billingKey = 'fetchx.crawl' as const;
    let billing: Awaited<ReturnType<typeof this.billingService.deductOrThrow>> =
      null;

    try {
      // 创建起始页面
      await this.prisma.crawlPage.create({
        data: {
          crawlJobId: job.id,
          url: options.url,
          depth: 0,
          status: 'PENDING',
        },
      });

      // 扣费（用于失败全退）
      billing = await this.billingService.deductOrThrow({
        userId,
        billingKey,
        referenceId: job.id,
      });

      if (billing) {
        const primary = billing.deduct.breakdown[0] ?? null;
        await this.prisma.crawlJob.update({
          where: { id: job.id },
          data: {
            quotaDeducted: true,
            quotaSource: primary?.source ?? null,
            quotaAmount: billing.amount,
            quotaTransactionId: primary?.transactionId ?? null,
            quotaBreakdown: billing.deduct.breakdown as Prisma.InputJsonValue,
            billingKey,
          },
        });
      }

      // 加入队列
      await this.crawlQueue.add(
        'crawl-start',
        { crawlJobId: job.id },
        { jobId: job.id },
      );
    } catch (error) {
      // 初始化失败：尽量回滚并退费
      if (billing) {
        await this.billingService.refundOnFailure({
          userId,
          billingKey,
          referenceId: job.id,
          breakdown: billing.deduct.breakdown,
        });
      }

      await this.prisma.crawlJob.delete({ where: { id: job.id } });
      throw error;
    }

    this.logger.log(`Crawl job started: ${job.id} for ${options.url}`);

    // 根据 sync 参数决定返回方式
    if (options.sync !== false) {
      // 同步模式（默认）：等待任务完成
      return this.waitForCompletion(
        job.id,
        options.timeout || DEFAULT_CRAWL_TIMEOUT,
      );
    }

    // 异步模式：返回任务 ID
    return { id: job.id, status: job.status };
  }

  /**
   * 等待爬取任务完成
   */
  private async waitForCompletion(
    jobId: string,
    timeout: number,
  ): Promise<CrawlStatus> {
    const queueJob = await this.crawlQueue.getJob(jobId);
    if (!queueJob) {
      throw new CrawlJobNotFoundError(jobId);
    }

    await queueJob.waitUntilFinished(this.queueEvents, timeout);

    const status = await this.getStatus(jobId);
    if (!status) {
      throw new CrawlJobNotFoundError(jobId);
    }

    if (status.status === 'FAILED') {
      throw new CrawlFailedError(status.startUrl, 'Crawl job failed');
    }

    return status;
  }

  /**
   * 获取爬取任务状态
   */
  async getStatus(jobId: string): Promise<CrawlStatus | null> {
    const job = await this.prisma.crawlJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return null;

    const result: CrawlStatus = {
      id: job.id,
      status: job.status,
      startUrl: job.startUrl,
      totalUrls: job.totalUrls,
      completedUrls: job.completedUrls,
      failedUrls: job.failedUrls,
      createdAt: job.createdAt,
      startedAt: job.startedAt ?? undefined,
      completedAt: job.completedAt ?? undefined,
    };

    // 如果已完成，返回所有页面数据
    if (job.status === 'COMPLETED') {
      const pages = await this.prisma.crawlPage.findMany({
        where: { crawlJobId: jobId, status: 'COMPLETED' },
        select: {
          url: true,
          depth: true,
          result: true,
        },
      });

      result.data = pages.map((page) => ({
        url: page.url,
        depth: page.depth,
        ...((page.result as Record<string, unknown>) || {}),
      })) as CrawlPageResult[];
    }

    return result;
  }

  /**
   * 取消爬取任务
   */
  async cancelCrawl(jobId: string): Promise<void> {
    await this.prisma.crawlJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Crawl job cancelled: ${jobId}`);
  }

  /**
   * 获取用户的爬取历史
   */
  async getHistory(userId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.crawlJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
    });
  }
}
