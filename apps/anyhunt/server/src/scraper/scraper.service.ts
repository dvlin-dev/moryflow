/**
 * [INPUT]: ScrapeOptions - URL, formats, wait options, actions, sync mode
 * [OUTPUT]: ScrapeResult (sync) | JobId (async) - Based on sync option
 * [POS]: Core scraping orchestrator, handles cache, queue, and quota coordination
 *        使用有效订阅（ACTIVE）决定水印/保留等策略
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, type QueueEvents } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../../generated/prisma-main/client';
import { UrlValidator } from '../common/validators/url.validator';
import { SCRAPE_QUEUE, createQueueEvents } from '../queue';
import { createHash } from 'crypto';
import type { ScrapeOptions } from './dto/scrape.dto';
import type { ScrapeResult } from './scraper.types';
import { DEFAULT_SCRAPE_TIMEOUT } from './scraper.constants';
import { BillingService } from '../billing/billing.service';
import { getEffectiveSubscriptionTier } from '../common/utils/subscription-tier';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly queueEvents: QueueEvents;
  private readonly cacheTtlMs: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private urlValidator: UrlValidator,
    @InjectQueue(SCRAPE_QUEUE) private scrapeQueue: Queue,
    private billingService: BillingService,
  ) {
    // 可配置的缓存 TTL，默认 1 小时
    this.cacheTtlMs = config.get('SCRAPE_CACHE_TTL_MS') || 3600000;

    // 用于等待任务完成
    this.queueEvents = createQueueEvents(SCRAPE_QUEUE, config);
  }

  /**
   * 计算请求哈希，用于缓存
   */
  private computeHash(options: ScrapeOptions): string {
    const payload = JSON.stringify(options);
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * 抓取网页
   * - sync=true（默认）：等待任务完成后返回完整结果
   * - sync=false：立即返回任务 ID，客户端轮询获取结果
   */
  async scrape(
    userId: string,
    options: ScrapeOptions,
    apiKeyId?: string,
    billingOptions?: { bill?: boolean },
  ): Promise<ScrapeResult | { id: string; status: string }> {
    // 1. SSRF 防护 - 验证 URL
    if (!(await this.urlValidator.isAllowed(options.url))) {
      throw new Error('URL not allowed: possible SSRF attack');
    }

    const requestHash = this.computeHash(options);

    // 2. 检查缓存（可配置 TTL）
    const cached = await this.prisma.scrapeJob.findFirst({
      where: {
        requestHash,
        status: 'COMPLETED',
        createdAt: { gte: new Date(Date.now() - this.cacheTtlMs) },
      },
    });

    if (cached) {
      // 缓存命中：直接返回格式化后的结果
      return this.formatResult({ ...cached, fromCache: true });
    }

    // 3. 获取用户套餐信息（用于水印和文件过期时间）
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: { select: { tier: true, status: true } } },
    });
    const tier = getEffectiveSubscriptionTier(user?.subscription, 'FREE');

    // 4. 创建任务记录
    const job = await this.prisma.scrapeJob.create({
      data: {
        userId,
        apiKeyId,
        url: options.url,
        requestHash,
        options: JSON.parse(JSON.stringify(options)) as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });

    const billingKey = 'fetchx.scrape' as const;
    let billing: Awaited<ReturnType<typeof this.billingService.deductOrThrow>> =
      null;
    if (billingOptions?.bill) {
      try {
        billing = await this.billingService.deductOrThrow({
          userId,
          billingKey,
          referenceId: job.id,
          fromCache: false,
        });
      } catch (error) {
        // 扣费失败：清理任务记录，避免产生无效任务
        await this.prisma.scrapeJob.delete({ where: { id: job.id } });
        throw error;
      }

      // 5. 记录扣费信息（用于失败退款）
      if (billing) {
        const primary = billing.deduct.breakdown[0] ?? null;
        await this.prisma.scrapeJob.update({
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
    }

    try {
      // 6. 加入队列（包含 userId 和 tier）
      await this.scrapeQueue.add(
        'scrape',
        {
          jobId: job.id,
          userId,
          url: options.url,
          options,
          tier,
        },
        {
          jobId: job.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    } catch (error) {
      // 队列失败：标记任务失败并退费（幂等）
      await this.prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          errorCode: 'BROWSER_ERROR',
        },
      });

      if (billing) {
        await this.billingService.refundOnFailure({
          userId,
          billingKey,
          referenceId: job.id,
          breakdown: billing.deduct.breakdown,
        });
      }

      throw error;
    }

    // 7. 根据 sync 参数决定返回方式
    if (options.sync !== false) {
      // 同步模式（默认）：等待任务完成
      return this.waitForCompletion(
        job.id,
        options.timeout || DEFAULT_SCRAPE_TIMEOUT,
      );
    }

    // 异步模式：返回任务 ID
    return { id: job.id, status: job.status };
  }

  /**
   * 同步抓取（内部使用）
   * 用于 Extract API、Search API、Crawler 等需要立即获取结果的场景
   * 不扣费，由调用方自行处理计费
   * 参数不需要传 sync，内部强制同步模式
   */
  async scrapeSync(
    userId: string,
    options: Omit<ScrapeOptions, 'sync'>,
    apiKeyId?: string,
  ): Promise<ScrapeResult> {
    const result = await this.scrape(
      userId,
      { ...options, sync: true } as ScrapeOptions,
      apiKeyId,
      { bill: false },
    );
    return result as ScrapeResult;
  }

  /**
   * 等待任务完成
   */
  private async waitForCompletion(
    jobId: string,
    timeout: number,
  ): Promise<ScrapeResult> {
    // 监听任务完成事件
    const queueJob = await this.scrapeQueue.getJob(jobId);
    if (!queueJob) {
      throw new Error('Job not found');
    }

    // waitUntilFinished 内部已处理超时
    await queueJob.waitUntilFinished(this.queueEvents, timeout);

    // 获取完整的任务数据
    const scrapeJob = await this.prisma.scrapeJob.findUnique({
      where: { id: jobId },
    });

    if (!scrapeJob) {
      throw new Error('Job not found in database');
    }

    if (scrapeJob.status === 'FAILED') {
      throw new Error(scrapeJob.error || 'Scrape failed');
    }

    return this.formatResult(scrapeJob);
  }

  /**
   * 格式化返回结果
   */
  private formatResult(job: {
    id: string;
    url: string;
    fromCache?: boolean;
    result?: unknown;
    screenshotUrl?: string | null;
    screenshotBase64?: string | null;
    screenshotWidth?: number | null;
    screenshotHeight?: number | null;
    screenshotFormat?: string | null;
    screenshotFileSize?: number | null;
    screenshotExpiresAt?: Date | null;
    pdfUrl?: string | null;
    pdfFileSize?: number | null;
    pdfPageCount?: number | null;
    pdfExpiresAt?: Date | null;
  }): ScrapeResult {
    const result = (job.result as Record<string, unknown>) || {};

    return {
      id: job.id,
      url: job.url,
      fromCache: job.fromCache || false,
      markdown: result.markdown as string | undefined,
      html: result.html as string | undefined,
      rawHtml: result.rawHtml as string | undefined,
      links: result.links as string[] | undefined,
      metadata: result.metadata as ScrapeResult['metadata'],
      screenshot:
        job.screenshotUrl || job.screenshotBase64
          ? {
              url: job.screenshotUrl || undefined,
              base64: job.screenshotBase64 || undefined,
              width: job.screenshotWidth || 0,
              height: job.screenshotHeight || 0,
              format: job.screenshotFormat || 'png',
              fileSize: job.screenshotFileSize || 0,
              expiresAt: job.screenshotExpiresAt || undefined,
            }
          : undefined,
      pdf: job.pdfUrl
        ? {
            url: job.pdfUrl,
            pageCount: job.pdfPageCount || 1,
            fileSize: job.pdfFileSize || 0,
            expiresAt: job.pdfExpiresAt || new Date(),
          }
        : undefined,
    };
  }

  /**
   * 获取任务状态
   */
  async getStatus(jobId: string) {
    return this.prisma.scrapeJob.findUnique({
      where: { id: jobId },
    });
  }

  /**
   * 获取用户的抓取历史
   */
  async getHistory(userId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.scrapeJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
