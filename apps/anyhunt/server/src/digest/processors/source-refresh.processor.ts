/**
 * Source Refresh Processor
 *
 * [INPUT]: DigestSourceRefreshJobData
 * [OUTPUT]: 刷新 DigestSource 并入池新内容
 * [POS]: BullMQ Worker - 处理 RSS、Site Crawl 等源的定时刷新
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DigestRssService,
  type RssSourceConfig,
} from '../services/rss.service';
import {
  DigestSiteCrawlService,
  type SiteCrawlSourceConfig,
} from '../services/site-crawl.service';
import { DigestContentService } from '../services/content.service';
import { DIGEST_SOURCE_REFRESH_QUEUE } from '../../queue/queue.constants';
import type { DigestSourceRefreshJobData } from '../../queue/queue.constants';
import { getNextRunTime } from '../utils/cron.utils';
import { SOURCE_DEFAULTS } from '../digest.constants';

@Processor(DIGEST_SOURCE_REFRESH_QUEUE)
export class SourceRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(SourceRefreshProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rssService: DigestRssService,
    private readonly siteCrawlService: DigestSiteCrawlService,
    private readonly contentService: DigestContentService,
  ) {
    super();
  }

  async process(job: Job<DigestSourceRefreshJobData>) {
    const { sourceId, sourceType } = job.data;

    this.logger.log(`Processing source refresh: ${sourceId} (${sourceType})`);

    try {
      // 1. 获取源配置
      const source = await this.prisma.digestSource.findUnique({
        where: { id: sourceId },
        include: {
          subscriptionSources: {
            take: 1,
            include: { subscription: { select: { userId: true } } },
          },
        },
      });

      if (!source || !source.enabled) {
        this.logger.warn(`Source ${sourceId} not found or disabled`);
        return { success: false, reason: 'Source not found or disabled' };
      }

      // 获取关联的用户 ID（用于 Site Crawl 需要 billing）
      const userId = source.subscriptionSources[0]?.subscription.userId;

      // 2. 根据源类型刷新
      let ingestedCount = 0;
      let errorMessage: string | undefined;

      try {
        switch (source.type) {
          case 'rss':
            ingestedCount = await this.refreshRssSource(
              source.config as unknown as RssSourceConfig,
            );
            break;

          case 'siteCrawl':
            ingestedCount = await this.refreshSiteCrawlSource(
              userId,
              source.config as unknown as SiteCrawlSourceConfig,
            );
            break;

          default:
            this.logger.warn(`Unknown source type: ${source.type}`);
            return { success: false, reason: 'Unknown source type' };
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to refresh source ${sourceId}:`, error);
      }

      // 3. 更新源状态
      const updateData: { lastRefreshAt: Date; nextRefreshAt?: Date | null } = {
        lastRefreshAt: new Date(),
      };

      // 计算下次刷新时间（仅 SCHEDULED 模式）
      if (source.refreshMode === 'SCHEDULED' && source.refreshCron) {
        updateData.nextRefreshAt = getNextRunTime(
          source.refreshCron,
          source.timezone || 'UTC',
          new Date(),
        );
      }

      await this.prisma.digestSource.update({
        where: { id: sourceId },
        data: updateData,
      });

      // 记录错误日志（如果有）
      if (errorMessage) {
        this.logger.warn(
          `Source ${sourceId} refresh had error: ${errorMessage}`,
        );
      }

      this.logger.log(
        `Completed source refresh ${sourceId}: ${ingestedCount} items ingested`,
      );

      return {
        success: !errorMessage,
        ingestedCount,
        error: errorMessage,
      };
    } catch (error) {
      this.logger.error(`Failed to process source refresh ${sourceId}:`, error);
      throw error;
    }
  }

  /**
   * 刷新 RSS 源
   */
  private async refreshRssSource(config: RssSourceConfig): Promise<number> {
    const { feedUrl, maxItems = SOURCE_DEFAULTS.rssMaxItems } = config;

    this.logger.debug(`Refreshing RSS source: ${feedUrl}`);

    // 1. 获取 RSS 内容
    const rssResult = await this.rssService.fetchAndParse({
      feedUrl,
      maxItems,
    });

    this.logger.debug(`Fetched ${rssResult.items.length} RSS items`);

    // 2. 入池内容
    let ingestedCount = 0;
    for (const item of rssResult.items) {
      try {
        await this.contentService.ingestContent({
          url: item.url,
          title: item.title,
          description: item.description,
          publishedAt: item.pubDate,
          author: item.author,
        });

        ingestedCount++;
      } catch (error) {
        this.logger.warn(`Failed to ingest RSS item ${item.url}:`, error);
      }
    }

    return ingestedCount;
  }

  /**
   * 刷新 Site Crawl 源
   */
  private async refreshSiteCrawlSource(
    userId: string | undefined,
    config: SiteCrawlSourceConfig,
  ): Promise<number> {
    const {
      siteUrl,
      maxPages = SOURCE_DEFAULTS.siteCrawlMaxPages,
      includeSubdomains = false,
      pathPatterns,
      scrapeContent = true,
    } = config;

    this.logger.debug(`Refreshing Site Crawl source: ${siteUrl}`);

    // Site Crawl 需要用户 ID 进行 billing
    if (!userId) {
      throw new Error('UserId required for Site Crawl source');
    }

    // 1. 爬取网站
    const crawlResult = await this.siteCrawlService.crawlSite(userId, {
      siteUrl,
      maxPages,
      includeSubdomains,
      pathPatterns,
      scrapeContent,
    });

    this.logger.debug(`Crawled ${crawlResult.pages.length} pages`);

    // 2. 入池内容
    let ingestedCount = 0;
    for (const page of crawlResult.pages) {
      try {
        await this.contentService.ingestContent({
          url: page.url,
          title: page.title,
          description: page.description,
          fulltext: page.fulltext,
          publishedAt: page.publishedAt,
          author: page.author,
          siteName: page.siteName,
          favicon: page.favicon,
        });

        ingestedCount++;
      } catch (error) {
        this.logger.warn(`Failed to ingest page ${page.url}:`, error);
      }
    }

    return ingestedCount;
  }
}
