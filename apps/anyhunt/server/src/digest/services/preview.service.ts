/**
 * Digest Preview Service
 *
 * [INPUT]: 订阅配置 + 预览选项
 * [OUTPUT]: 预览结果（不写入数据库）
 * [POS]: 执行订阅预览，复用搜索/抓取/评分逻辑
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from '../../search/search.service';
import { ScraperService } from '../../scraper/scraper.service';
import { DEFAULT_SCRAPE_SYNC_TIMEOUT } from '../../scraper/scraper.constants';
import { DigestContentService } from './content.service';
import { DigestAiService } from './ai.service';
import {
  calculateRelevanceScore,
  calculateImpactScore,
  calculateQualityScore,
  calculateOverallScore,
} from '../utils/scoring.utils';
import { extractDomain } from '../utils/url.utils';
import type {
  PreviewSubscriptionQuery,
  PreviewItem,
  PreviewResponse,
} from '../dto';
import type { BillingBreakdown } from './run.service';
import { BILLING } from '../digest.constants';

/**
 * 预览配置（从订阅或直接输入）
 */
export interface PreviewConfig {
  topic: string;
  interests: string[];
  searchLimit: number;
  scrapeLimit: number;
  minItems: number;
  minScore: number;
}

@Injectable()
export class DigestPreviewService {
  private readonly logger = new Logger(DigestPreviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly scraperService: ScraperService,
    private readonly contentService: DigestContentService,
    private readonly aiService: DigestAiService,
  ) {}

  /**
   * 执行订阅预览
   *
   * 与实际运行流程相同，但不写入数据库
   */
  async previewSubscription(
    userId: string,
    subscriptionId: string,
    query: PreviewSubscriptionQuery,
  ): Promise<PreviewResponse> {
    // 1. 获取订阅配置
    const subscription = await this.prisma.digestSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
        deletedAt: null,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // 2. 执行预览
    return this.executePreview(
      userId,
      {
        topic: subscription.topic,
        interests: subscription.interests,
        searchLimit: subscription.searchLimit,
        scrapeLimit: subscription.scrapeLimit,
        minItems: subscription.minItems,
        minScore: subscription.minScore,
      },
      query,
    );
  }

  /**
   * 执行预览（内部方法）
   */
  private async executePreview(
    userId: string,
    config: PreviewConfig,
    query: PreviewSubscriptionQuery,
  ): Promise<PreviewResponse> {
    const { includeNarrative, locale } = query;
    const billingBreakdown: BillingBreakdown = {};

    this.logger.debug(`Executing preview for topic: ${config.topic}`);

    // 1. 执行搜索
    const searchResults = await this.performSearch(
      userId,
      config,
      billingBreakdown,
    );

    this.logger.debug(`Search returned ${searchResults.length} results`);

    // 2. 抓取内容（限制数量以节省成本）
    const previewScrapeLimit = Math.min(config.scrapeLimit, 5); // 预览最多抓取 5 条
    const scrapedContents = await this.scrapeContents(
      userId,
      searchResults,
      previewScrapeLimit,
      billingBreakdown,
    );

    // 3. 评分（不入池，仅计算）
    const scoredItems = await this.scoreContents(
      searchResults,
      scrapedContents,
      config,
      locale,
      billingBreakdown,
    );

    // 4. 筛选
    const selectedItems = this.selectTopItems(
      scoredItems,
      config.minItems,
      config.minScore,
    );

    // 5. 转换为预览响应格式
    const previewItems: PreviewItem[] = selectedItems.map((item) => ({
      title: item.title,
      url: item.url,
      aiSummary: item.aiSummary,
      scoreOverall: item.scoreOverall,
      scoringReason: item.scoringReason,
      rank: item.rank,
    }));

    // 6. 可选：生成叙事摘要
    let narrative: string | undefined;
    if (includeNarrative && previewItems.length > 0) {
      const narrativeResult = await this.aiService.generateNarrative(
        previewItems.map((item) => ({
          title: item.title,
          url: item.url,
          aiSummary: item.aiSummary,
          scoreOverall: item.scoreOverall,
          scoringReason: item.scoringReason,
        })),
        { topic: config.topic, interests: config.interests },
        locale,
        billingBreakdown,
      );
      narrative = narrativeResult.result || undefined;
    }

    this.logger.debug(
      `Preview completed: ${previewItems.length} items selected from ${searchResults.length} candidates`,
    );

    return {
      items: previewItems,
      narrative,
      stats: {
        itemsCandidate: searchResults.length,
        itemsSelected: previewItems.length,
      },
    };
  }

  /**
   * 执行搜索
   */
  private async performSearch(
    userId: string,
    config: PreviewConfig,
    billingBreakdown: BillingBreakdown,
  ): Promise<
    Array<{
      url: string;
      title: string;
      description?: string;
    }>
  > {
    const query = [config.topic, ...config.interests].filter(Boolean).join(' ');

    const response = await this.searchService.search(userId, {
      query,
      limit: config.searchLimit,
      scrapeResults: false,
    });

    billingBreakdown['fetchx.search'] = {
      count: 1,
      costPerCall: BILLING.costs['fetchx.search'],
      subtotalCredits: BILLING.costs['fetchx.search'],
    };

    return response.results.map((r) => ({
      url: r.url,
      title: r.title,
      description: r.description,
    }));
  }

  /**
   * 抓取内容
   */
  private async scrapeContents(
    userId: string,
    searchResults: Array<{ url: string; title: string }>,
    scrapeLimit: number,
    billingBreakdown: BillingBreakdown,
  ): Promise<
    Map<string, { fulltext: string; siteName?: string; favicon?: string }>
  > {
    const scrapedMap = new Map<
      string,
      { fulltext: string; siteName?: string; favicon?: string }
    >();

    if (scrapeLimit <= 0) {
      return scrapedMap;
    }

    const toScrape = searchResults.slice(0, scrapeLimit);
    let scrapeCount = 0;

    for (const result of toScrape) {
      try {
        const scrapeResult = await this.scraperService.scrape(
          userId,
          {
            url: result.url,
            formats: ['markdown'],
            onlyMainContent: true,
            timeout: 30000,
            mobile: false,
            darkMode: false,
            sync: true,
            syncTimeout: DEFAULT_SCRAPE_SYNC_TIMEOUT,
          },
          undefined,
          { bill: true },
        );

        if ('markdown' in scrapeResult && scrapeResult.markdown) {
          scrapedMap.set(result.url, {
            fulltext: scrapeResult.markdown,
            siteName: scrapeResult.metadata?.ogSiteName || undefined,
            favicon: scrapeResult.metadata?.favicon || undefined,
          });
          scrapeCount++;
        }
      } catch (error) {
        this.logger.warn(`Failed to scrape ${result.url}:`, error);
      }
    }

    if (scrapeCount > 0) {
      billingBreakdown['fetchx.scrape'] = {
        count: scrapeCount,
        costPerCall: BILLING.costs['fetchx.scrape'],
        subtotalCredits: scrapeCount * BILLING.costs['fetchx.scrape'],
      };
    }

    return scrapedMap;
  }

  /**
   * 评分内容（不入池）
   */
  private async scoreContents(
    searchResults: Array<{
      url: string;
      title: string;
      description?: string;
    }>,
    scrapedContents: Map<
      string,
      { fulltext: string; siteName?: string; favicon?: string }
    >,
    config: PreviewConfig,
    locale: string,
    billingBreakdown: BillingBreakdown,
  ): Promise<
    Array<{
      url: string;
      title: string;
      aiSummary?: string;
      scoreRelevance: number;
      scoreOverall: number;
      scoringReason?: string;
      rank: number;
    }>
  > {
    const scoredItems: Array<{
      url: string;
      title: string;
      aiSummary?: string;
      scoreRelevance: number;
      scoreOverall: number;
      scoringReason?: string;
      rank: number;
    }> = [];

    for (const result of searchResults) {
      const scraped = scrapedContents.get(result.url);

      // 计算评分
      const { score: relevance, reason } = calculateRelevanceScore(
        {
          title: result.title,
          description: result.description,
          fulltext: scraped?.fulltext,
        },
        config,
      );

      const impact = calculateImpactScore({
        domain: extractDomain(result.url),
        siteName: scraped?.siteName,
      });

      const quality = calculateQualityScore({
        title: result.title,
        description: result.description,
        fulltext: scraped?.fulltext,
      });

      const overall = calculateOverallScore({ relevance, impact, quality });

      // 生成 AI 摘要（如果有内容）
      let aiSummary: string | undefined;
      if (scraped?.fulltext || result.description) {
        const { result: summary } = await this.aiService.generateSummary(
          {
            title: result.title,
            description: result.description,
            fulltext: scraped?.fulltext,
            url: result.url,
          },
          locale,
          billingBreakdown,
        );
        aiSummary = summary;
      }

      scoredItems.push({
        url: result.url,
        title: result.title,
        aiSummary,
        scoreRelevance: relevance,
        scoreOverall: overall,
        scoringReason: reason,
        rank: 0,
      });
    }

    // 排序并设置排名
    scoredItems.sort((a, b) => b.scoreOverall - a.scoreOverall);
    scoredItems.forEach((item, index) => {
      item.rank = index + 1;
    });

    return scoredItems;
  }

  /**
   * 筛选 Top N 条目
   */
  private selectTopItems<T extends { scoreOverall: number }>(
    items: T[],
    minItems: number,
    minScore: number,
  ): T[] {
    // 先按最低分数筛选
    let filtered = items.filter((item) => item.scoreOverall >= minScore);

    // 如果筛选后数量不足，放宽条件
    if (filtered.length < minItems) {
      filtered = items.slice(0, minItems);
    }

    // 取 minItems 条
    return filtered.slice(0, minItems);
  }
}
