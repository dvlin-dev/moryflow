/**
 * [INPUT]: BatchScrapeJobData - Job ID and scrape options from BullMQ
 * [OUTPUT]: void - Updates database and triggers webhooks
 * [POS]: BullMQ worker that processes batch scrape jobs concurrently with idempotent progress
 *
 * [PROTOCOL]: When this file changes, update this header and src/batch-scrape/CLAUDE.md
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma-main/client';
import { ScraperService } from '../scraper/scraper.service';
import { WebhookService } from '../common/services/webhook.service';
import { BillingService } from '../billing/billing.service';
import { BILLING_KEYS, type BillingKey } from '../billing/billing.rules';
import { parseQuotaBreakdown } from '../billing/quota-breakdown.utils';
import { BATCH_SCRAPE_QUEUE } from '../queue/queue.constants';
import type { BatchScrapeJobData } from './batch-scrape.types';

/** 默认并发数 */
const DEFAULT_CONCURRENCY = 5;
const BILLING_KEY_SET = new Set<string>(BILLING_KEYS);

@Processor(BATCH_SCRAPE_QUEUE)
export class BatchScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(BatchScrapeProcessor.name);
  private readonly concurrency: number;

  constructor(
    private prisma: PrismaService,
    private scraperService: ScraperService,
    private webhookService: WebhookService,
    private billingService: BillingService,
    private config: ConfigService,
  ) {
    super();
    this.concurrency =
      config.get('BATCH_SCRAPE_CONCURRENCY') || DEFAULT_CONCURRENCY;
  }

  async process(job: Job<BatchScrapeJobData>) {
    const { batchJobId, options } = job.data;

    this.logger.debug(`Processing batch scrape job: ${batchJobId}`);

    const batch = await this.prisma.batchScrapeJob.findUnique({
      where: { id: batchJobId },
    });

    if (!batch) {
      this.logger.warn(`Batch scrape job not found: ${batchJobId}`);
      return;
    }

    if (batch.status === 'COMPLETED' || batch.status === 'FAILED') {
      this.logger.debug(`Batch scrape job already finalized: ${batchJobId}`);
      return;
    }

    if (batch.status !== 'PROCESSING') {
      await this.prisma.batchScrapeJob.update({
        where: { id: batchJobId },
        data: { status: 'PROCESSING' },
      });
    }

    // 获取所有待处理项
    const items = await this.prisma.batchScrapeItem.findMany({
      where: { batchJobId, status: 'PENDING' },
      orderBy: { order: 'asc' },
    });

    const [initialCompleted, initialFailed] = await Promise.all([
      this.prisma.batchScrapeItem.count({
        where: { batchJobId, status: 'COMPLETED' },
      }),
      this.prisma.batchScrapeItem.count({
        where: { batchJobId, status: 'FAILED' },
      }),
    ]);

    let completedCount = initialCompleted;
    let failedCount = initialFailed;

    if (items.length === 0) {
      await this.finalizeBatch(batchJobId, batch, completedCount, failedCount);
      return;
    }

    // 分块并发处理
    const chunks = this.chunkArray(items, this.concurrency);

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map((item) =>
          this.processItem(item.id, item.url, batch.userId, options),
        ),
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          completedCount++;
        } else {
          failedCount++;
        }
      }

      // 更新进度
      await this.prisma.batchScrapeJob.update({
        where: { id: batchJobId },
        data: {
          completedUrls: completedCount,
          failedUrls: failedCount,
        },
      });
    }

    await this.finalizeBatch(batchJobId, batch, completedCount, failedCount);
  }

  private async finalizeBatch(
    batchJobId: string,
    batch: {
      id: string;
      userId: string;
      totalUrls: number;
      webhookUrl: string | null;
      quotaDeducted: boolean;
      quotaBreakdown: unknown;
      billingKey: string | null;
    },
    completedCount: number,
    failedCount: number,
  ): Promise<void> {
    const totalProcessed = completedCount + failedCount;
    if (totalProcessed < batch.totalUrls) {
      return;
    }

    const finalStatus =
      completedCount === 0 && failedCount > 0 ? 'FAILED' : 'COMPLETED';

    const updatedBatch = await this.prisma.batchScrapeJob.update({
      where: { id: batchJobId },
      data: {
        status: finalStatus,
        completedUrls: completedCount,
        failedUrls: failedCount,
        completedAt: new Date(),
      },
    });

    // 全失败：失败退款（幂等）
    const breakdown = parseQuotaBreakdown(updatedBatch.quotaBreakdown);

    if (
      updatedBatch.status === 'FAILED' &&
      updatedBatch.quotaDeducted &&
      breakdown &&
      updatedBatch.billingKey &&
      BILLING_KEY_SET.has(updatedBatch.billingKey)
    ) {
      await this.billingService.refundOnFailure({
        userId: updatedBatch.userId,
        billingKey: updatedBatch.billingKey as BillingKey,
        referenceId: updatedBatch.id,
        breakdown,
      });
    }

    // 触发 Webhook
    if (updatedBatch.webhookUrl) {
      await this.triggerWebhook(batchJobId);
    }

    this.logger.log(
      `Batch scrape completed: ${batchJobId} (${completedCount} success, ${failedCount} failed)`,
    );
  }

  /**
   * 处理单个项目
   */
  private async processItem(
    itemId: string,
    url: string,
    userId: string,
    options: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    try {
      // 使用 ScraperService 抓取页面
      const scrapeResult = await this.scraperService.scrapeSync(userId, {
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000,
        mobile: false,
        darkMode: false,
        ...options,
      });

      // 更新项目状态
      await this.prisma.batchScrapeItem.update({
        where: { id: itemId },
        data: {
          status: 'COMPLETED',
          result: JSON.parse(
            JSON.stringify(scrapeResult),
          ) as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      // 记录错误
      await this.prisma.batchScrapeItem.update({
        where: { id: itemId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return { success: false };
    }
  }

  /**
   * 触发 Webhook 回调
   */
  private async triggerWebhook(batchJobId: string): Promise<void> {
    const batch = await this.prisma.batchScrapeJob.findUnique({
      where: { id: batchJobId },
      include: {
        items: {
          orderBy: { order: 'asc' },
          select: { url: true, status: true, result: true, error: true },
        },
      },
    });

    if (!batch?.webhookUrl) return;

    await this.webhookService.send(batch.webhookUrl, {
      event: 'batch_scrape.completed',
      data: {
        id: batch.id,
        status: batch.status,
        totalUrls: batch.totalUrls,
        completedUrls: batch.completedUrls,
        failedUrls: batch.failedUrls,
        items: batch.items,
      },
    });
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
