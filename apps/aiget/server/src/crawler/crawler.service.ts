/**
 * [INPUT]: CrawlOptions - URL, depth limit, page limit, filters
 * [OUTPUT]: CrawlJob - Async job reference for status polling
 * [POS]: Crawl job orchestrator, manages URL frontier and page queue
 *
 * [PROTOCOL]: When this file changes, update this header and src/crawler/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { UrlValidator } from '../common/validators/url.validator';
import { CRAWL_QUEUE } from '../queue/queue.constants';
import { BillingService } from '../billing/billing.service';
import type { CrawlOptions } from './dto/crawl.dto';
import type { CrawlStatus, CrawlPageResult } from './crawler.types';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private prisma: PrismaService,
    private urlValidator: UrlValidator,
    @InjectQueue(CRAWL_QUEUE) private crawlQueue: Queue,
    private billingService: BillingService,
  ) {}

  /**
   * 启动爬取任务
   */
  async startCrawl(userId: string, options: CrawlOptions) {
    // SSRF 防护
    if (!this.urlValidator.isAllowed(options.url)) {
      throw new Error('URL not allowed: possible SSRF attack');
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
        await this.prisma.crawlJob.update({
          where: { id: job.id },
          data: {
            quotaDeducted: true,
            quotaSource: billing.deduct.source,
            quotaAmount: billing.amount,
            quotaTransactionId: billing.deduct.transactionId,
            billingKey,
          },
        });
      }

      // 加入队列
      await this.crawlQueue.add('crawl-start', {
        crawlJobId: job.id,
      });
    } catch (error) {
      // 初始化失败：尽量回滚并退费
      if (billing) {
        await this.billingService.refundOnFailure({
          userId,
          billingKey,
          referenceId: job.id,
          source: billing.deduct.source,
          amount: billing.amount,
        });
      }

      await this.prisma.crawlJob.delete({ where: { id: job.id } });
      throw error;
    }

    this.logger.log(`Crawl job started: ${job.id} for ${options.url}`);

    return job;
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
