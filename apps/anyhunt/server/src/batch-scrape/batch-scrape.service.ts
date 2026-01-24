/**
 * [INPUT]: BatchScrapeOptions - URLs list and scrape configuration, sync mode
 * [OUTPUT]: BatchScrapeStatus (sync) | { id, status, totalUrls } (async)
 * [POS]: Core batch scrape logic - job creation, status tracking, history, QueueEvents lifecycle
 *
 * [PROTOCOL]: When this file changes, update this header and src/batch-scrape/CLAUDE.md
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, type QueueEvents } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma-main/client';
import { UrlValidator } from '../common/validators/url.validator';
import { BATCH_SCRAPE_QUEUE, createQueueEvents } from '../queue';
import { BillingService } from '../billing/billing.service';
import type { BatchScrapeOptions } from './dto/batch-scrape.dto';
import type { BatchScrapeStatus } from './batch-scrape.types';
import { BatchJobNotFoundError } from './batch-scrape.errors';
import { DEFAULT_BATCH_TIMEOUT } from './batch-scrape.constants';

@Injectable()
export class BatchScrapeService implements OnModuleDestroy {
  private readonly logger = new Logger(BatchScrapeService.name);
  private readonly queueEvents: QueueEvents;

  constructor(
    private prisma: PrismaService,
    private urlValidator: UrlValidator,
    @InjectQueue(BATCH_SCRAPE_QUEUE) private batchQueue: Queue,
    private billingService: BillingService,
    config: ConfigService,
  ) {
    // 用于等待任务完成
    this.queueEvents = createQueueEvents(BATCH_SCRAPE_QUEUE, config);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueEvents.close().catch((error) => {
      this.logger.warn('Failed to close QueueEvents', error);
    });
  }

  /**
   * 创建批量抓取任务
   * - sync=true（默认）：等待任务完成后返回完整结果
   * - sync=false：立即返回任务 ID，客户端轮询获取结果
   */
  async batchScrape(
    userId: string,
    options: BatchScrapeOptions,
  ): Promise<
    BatchScrapeStatus | { id: string; status: string; totalUrls: number }
  > {
    const { urls, scrapeOptions, webhookUrl } = options;

    // SSRF 防护
    for (const url of urls) {
      if (!(await this.urlValidator.isAllowed(url))) {
        throw new Error(`URL not allowed: ${url}`);
      }
    }

    if (webhookUrl && !(await this.urlValidator.isAllowed(webhookUrl))) {
      throw new Error(`Webhook URL not allowed: ${webhookUrl}`);
    }

    // 创建批次任务
    const batch = await this.prisma.batchScrapeJob.create({
      data: {
        userId,
        status: 'PENDING',
        totalUrls: urls.length,
        webhookUrl,
        options: JSON.parse(
          JSON.stringify(scrapeOptions || {}),
        ) as Prisma.InputJsonValue,
      },
    });

    const billingKey = 'fetchx.batchScrape' as const;
    let billing: Awaited<ReturnType<typeof this.billingService.deductOrThrow>> =
      null;
    try {
      // 创建每个 URL 的子任务
      await this.prisma.batchScrapeItem.createMany({
        data: urls.map((url, index) => ({
          batchJobId: batch.id,
          url,
          order: index,
          status: 'PENDING',
        })),
      });

      // 扣费（用于失败全退）
      billing = await this.billingService.deductOrThrow({
        userId,
        billingKey,
        referenceId: batch.id,
      });

      if (billing) {
        const primary = billing.deduct.breakdown[0] ?? null;
        await this.prisma.batchScrapeJob.update({
          where: { id: batch.id },
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

      // 启动批次处理
      await this.batchQueue.add(
        'batch-start',
        {
          batchJobId: batch.id,
          options: scrapeOptions || {},
        },
        { jobId: batch.id },
      );
    } catch (error) {
      // 队列/扣费/创建失败：尽量回滚并退费
      if (billing) {
        await this.billingService.refundOnFailure({
          userId,
          billingKey,
          referenceId: batch.id,
          breakdown: billing.deduct.breakdown,
        });
      }

      await this.prisma.batchScrapeJob.delete({ where: { id: batch.id } });
      throw error;
    }

    this.logger.log(
      `Batch scrape job started: ${batch.id} with ${urls.length} URLs`,
    );

    // 根据 sync 参数决定返回方式
    if (options.sync !== false) {
      // 同步模式（默认）：等待任务完成
      return this.waitForCompletion(
        batch.id,
        options.timeout || DEFAULT_BATCH_TIMEOUT,
      );
    }

    // 异步模式：返回任务 ID
    return { id: batch.id, status: batch.status, totalUrls: urls.length };
  }

  /**
   * 等待批量抓取任务完成
   */
  private async waitForCompletion(
    batchJobId: string,
    timeout: number,
  ): Promise<BatchScrapeStatus> {
    const queueJob = await this.batchQueue.getJob(batchJobId);
    if (!queueJob) {
      throw new BatchJobNotFoundError(batchJobId);
    }

    await queueJob.waitUntilFinished(this.queueEvents, timeout);

    const status = await this.getStatus(batchJobId);
    if (!status) {
      throw new BatchJobNotFoundError(batchJobId);
    }

    // 检查失败状态
    if (status.status === 'FAILED') {
      throw new Error(`Batch scrape job failed: ${batchJobId}`);
    }

    return status;
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
