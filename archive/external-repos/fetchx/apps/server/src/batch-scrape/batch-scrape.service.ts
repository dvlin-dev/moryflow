/**
 * [INPUT]: BatchScrapeOptions - URLs list and scrape configuration
 * [OUTPUT]: BatchScrapeJob | BatchScrapeStatus - Created job or job status
 * [POS]: Core batch scrape logic - job creation, status tracking, history
 *
 * [PROTOCOL]: When this file changes, update this header and src/batch-scrape/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { UrlValidator } from '../common/validators/url.validator';
import { BATCH_SCRAPE_QUEUE } from '../queue/queue.constants';
import type { BatchScrapeOptions } from './dto/batch-scrape.dto';
import type { BatchScrapeStatus, BatchScrapeItemResult } from './batch-scrape.types';

@Injectable()
export class BatchScrapeService {
  private readonly logger = new Logger(BatchScrapeService.name);

  constructor(
    private prisma: PrismaService,
    private urlValidator: UrlValidator,
    @InjectQueue(BATCH_SCRAPE_QUEUE) private batchQueue: Queue,
  ) {}

  /**
   * 创建批量抓取任务
   */
  async batchScrape(userId: string, options: BatchScrapeOptions) {
    const { urls, scrapeOptions, webhookUrl } = options;

    // SSRF 防护
    for (const url of urls) {
      if (!this.urlValidator.isAllowed(url)) {
        throw new Error(`URL not allowed: ${url}`);
      }
    }

    // 创建批次任务
    const batch = await this.prisma.batchScrapeJob.create({
      data: {
        userId,
        status: 'PENDING',
        totalUrls: urls.length,
        webhookUrl,
        options: JSON.parse(JSON.stringify(scrapeOptions || {})),
      },
    });

    // 创建每个 URL 的子任务
    await this.prisma.batchScrapeItem.createMany({
      data: urls.map((url, index) => ({
        batchJobId: batch.id,
        url,
        order: index,
        status: 'PENDING',
      })),
    });

    // 启动批次处理
    await this.batchQueue.add('batch-start', {
      batchJobId: batch.id,
      options: scrapeOptions || {},
    });

    this.logger.log(`Batch scrape job started: ${batch.id} with ${urls.length} URLs`);

    return batch;
  }

  /**
   * 获取批量抓取任务状态
   */
  async getStatus(batchJobId: string): Promise<BatchScrapeStatus | null> {
    const batch = await this.prisma.batchScrapeJob.findUnique({
      where: { id: batchJobId },
    });

    if (!batch) return null;

    const result: BatchScrapeStatus = {
      id: batch.id,
      status: batch.status,
      totalUrls: batch.totalUrls,
      completedUrls: batch.completedUrls,
      failedUrls: batch.failedUrls,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt ?? undefined,
    };

    // 如果已完成，返回所有项目数据
    if (batch.status === 'COMPLETED' || batch.status === 'FAILED') {
      const items = await this.prisma.batchScrapeItem.findMany({
        where: { batchJobId },
        orderBy: { order: 'asc' },
      });

      result.data = items.map((item) => ({
        url: item.url,
        status: item.status,
        result: (item.result as Record<string, unknown>) || undefined,
        error: item.error ?? undefined,
      }));
    }

    return result;
  }

  /**
   * 获取用户的批量抓取历史
   */
  async getHistory(userId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.batchScrapeJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
  }
}
