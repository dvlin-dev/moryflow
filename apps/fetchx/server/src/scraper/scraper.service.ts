/**
 * [INPUT]: ScrapeOptions - URL, formats, wait options, actions
 * [OUTPUT]: ScrapeResult | JobId - Cached result or async job reference
 * [POS]: Core scraping orchestrator, handles cache, queue, and quota coordination
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { UrlValidator } from '../common/validators/url.validator';
import { SCRAPE_QUEUE } from '../queue/queue.constants';
import { createHash } from 'crypto';
import type { ScrapeOptions } from './dto/scrape.dto';
import type { ScrapeResult } from './scraper.types';

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
  ) {
    // 可配置的缓存 TTL，默认 1 小时
    this.cacheTtlMs = config.get('SCRAPE_CACHE_TTL_MS') || 3600000;

    // 用于等待任务完成 - 解析 REDIS_URL
    const redisUrl =
      config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const parsed = new URL(redisUrl);
    this.queueEvents = new QueueEvents(SCRAPE_QUEUE, {
      connection: {
        host: parsed.hostname,
        port: parseInt(parsed.port, 10) || 6379,
        password: parsed.password || undefined,
      },
    });
  }

  /**
   * 计算请求哈希，用于缓存
   */
  private computeHash(options: ScrapeOptions): string {
    const payload = JSON.stringify(options);
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * 异步抓取 - 返回任务 ID，客户端轮询获取结果
   */
  async scrape(userId: string, options: ScrapeOptions, apiKeyId?: string) {
    // 1. SSRF 防护 - 验证 URL
    if (!this.urlValidator.isAllowed(options.url)) {
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
      return { ...cached, fromCache: true };
    }

    // 3. 获取用户套餐信息（用于水印和文件过期时间）
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: { select: { tier: true } } },
    });
    const tier = user?.subscription?.tier || 'FREE';

    // 4. 创建任务记录
    const job = await this.prisma.scrapeJob.create({
      data: {
        userId,
        apiKeyId,
        url: options.url,
        requestHash,

        options: JSON.parse(JSON.stringify(options)),
        status: 'PENDING',
      },
    });

    // 5. 加入队列（包含 userId 和 tier）
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

    return job;
  }

  /**
   * 同步抓取 - 等待任务完成后返回结果
   * 用于 Extract API、Search API 等需要立即获取结果的场景
   */
  async scrapeSync(
    userId: string,
    options: ScrapeOptions,
    apiKeyId?: string,
  ): Promise<ScrapeResult> {
    const job = await this.scrape(userId, options, apiKeyId);

    // 如果命中缓存，直接返回
    if ('fromCache' in job && job.fromCache) {
      return this.formatResult(job);
    }

    // 等待任务完成
    return this.waitForCompletion(job.id, options.timeout || 30000);
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
