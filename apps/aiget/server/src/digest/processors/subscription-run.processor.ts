/**
 * Subscription Run Processor
 *
 * [INPUT]: DigestSubscriptionRunJobData
 * [OUTPUT]: 执行订阅运行，投递内容到 Inbox
 * [POS]: BullMQ Worker - 订阅运行的核心执行逻辑
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from '../../search/search.service';
import { ScraperService } from '../../scraper/scraper.service';
import {
  DigestRunService,
  type BillingBreakdown,
} from '../services/run.service';
import { DigestContentService } from '../services/content.service';
import { DigestAiService } from '../services/ai.service';
import { DigestSourceService } from '../services/source.service';
import { DigestFeedbackService } from '../services/feedback.service';
import { DigestNotificationService } from '../services/notification.service';
import { DIGEST_SUBSCRIPTION_RUN_QUEUE } from '../../queue/queue.constants';
import type { DigestSubscriptionRunJobData } from '../../queue/queue.constants';
import { BILLING } from '../digest.constants';
import {
  calculateRelevanceScore,
  calculateImpactScore,
  calculateQualityScore,
  calculateOverallScore,
  type FeedbackPatternForScoring,
} from '../utils/scoring.utils';
import { extractDomain } from '../utils/url.utils';

@Processor(DIGEST_SUBSCRIPTION_RUN_QUEUE)
export class SubscriptionRunProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionRunProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly scraperService: ScraperService,
    private readonly runService: DigestRunService,
    private readonly contentService: DigestContentService,
    private readonly aiService: DigestAiService,
    private readonly sourceService: DigestSourceService,
    private readonly feedbackService: DigestFeedbackService,
    private readonly notificationService: DigestNotificationService,
  ) {
    super();
  }

  async process(job: Job<DigestSubscriptionRunJobData>) {
    const { subscriptionId, runId, userId, outputLocale } = job.data;

    this.logger.log(`Processing subscription run: ${runId}`);

    try {
      // 1. 开始运行
      await this.runService.startRun(runId);

      // 2. 获取订阅配置
      const subscription = await this.prisma.digestSubscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      // 3. 执行搜索
      const billingBreakdown: BillingBreakdown = {};
      let totalCredits = 0;

      const searchResults = await this.performSearch(
        userId,
        subscription,
        billingBreakdown,
      );
      totalCredits += billingBreakdown['fetchx.search']?.subtotalCredits || 0;

      this.logger.debug(`Search returned ${searchResults.length} results`);

      // 3.5 获取其他源（RSS、Site Crawl）的内容
      const sourceContents = await this.sourceService.fetchSourceContents(
        subscriptionId,
        subscription.contentWindowHours ?? 168,
      );

      this.logger.debug(
        `Source contents returned ${sourceContents.length} items`,
      );

      // 3.6 合并搜索结果和源内容
      const mergedContents = this.sourceService.mergeContents(
        searchResults,
        sourceContents,
      );

      this.logger.debug(`Merged ${mergedContents.length} total contents`);

      // 4. 抓取内容（可选）- 对合并后的内容进行抓取
      const scrapedContents = await this.scrapeContents(
        userId,
        mergedContents,
        subscription.scrapeLimit,
        billingBreakdown,
      );
      totalCredits += billingBreakdown['fetchx.scrape']?.subtotalCredits || 0;

      // 4.5 加载反馈模式用于评分调整
      const feedbackPatterns =
        await this.feedbackService.getPatterns(subscriptionId);
      const scoringPatterns: FeedbackPatternForScoring[] = feedbackPatterns.map(
        (p) => ({
          patternType: p.patternType as 'KEYWORD' | 'DOMAIN' | 'AUTHOR',
          value: p.value,
          positiveCount: p.positiveCount,
          negativeCount: p.negativeCount,
          confidence: p.confidence,
        }),
      );

      this.logger.debug(
        `Loaded ${scoringPatterns.length} feedback patterns for scoring`,
      );

      // 5. 内容入池和评分（包含 AI 摘要生成）
      const scoredItems = await this.processAndScoreContents(
        mergedContents,
        scrapedContents,
        subscription,
        outputLocale,
        billingBreakdown,
        scoringPatterns,
      );
      // 累加 AI 摘要成本
      totalCredits += billingBreakdown['ai.summary']?.subtotalCredits || 0;

      // 6. 去重
      const { dedupedItems, dedupSkipped, redelivered } =
        await this.deduplicateItems(scoredItems, subscription);

      // 7. 筛选和排序
      const selectedItems = this.selectTopItems(
        dedupedItems,
        subscription.minItems,
        subscription.minScore,
      );

      // 8. 创建运行条目并投递
      const deliveredIds: string[] = [];
      for (const item of selectedItems) {
        const runItem = await this.runService.createRunItem(
          runId,
          subscriptionId,
          userId,
          item.contentId,
          {
            canonicalUrlHash: item.canonicalUrlHash,
            scoreRelevance: item.scoreRelevance,
            scoreOverall: item.scoreOverall,
            scoringReason: item.scoringReason,
            rank: item.rank,
            titleSnapshot: item.title,
            urlSnapshot: item.url,
            aiSummarySnapshot: item.aiSummary,
          },
        );
        deliveredIds.push(runItem.id);
      }

      // 9. 投递到 Inbox
      if (deliveredIds.length > 0) {
        await this.runService.deliverItems(runId, deliveredIds);
      }

      // 10. 生成叙事稿（Writer narrative）
      let narrativeMarkdown: string | undefined;
      if (selectedItems.length > 0) {
        const narrativeResult = await this.aiService.generateNarrative(
          selectedItems.map((item) => ({
            title: item.title,
            url: item.url,
            aiSummary: item.aiSummary,
            scoreOverall: item.scoreOverall,
            scoringReason: item.scoringReason,
          })),
          { topic: subscription.topic, interests: subscription.interests },
          outputLocale,
          billingBreakdown,
        );
        narrativeMarkdown = narrativeResult.result || undefined;
        totalCredits += narrativeResult.cost;
      }

      // 11. 完成运行
      await this.runService.completeRun(
        runId,
        {
          itemsCandidate: mergedContents.length,
          itemsSelected: selectedItems.length,
          itemsDelivered: deliveredIds.length,
          itemsDedupSkipped: dedupSkipped,
          itemsRedelivered: redelivered,
        },
        { totalCredits, breakdown: billingBreakdown },
        narrativeMarkdown,
      );

      // 12. 更新订阅最后运行时间
      await this.prisma.digestSubscription.update({
        where: { id: subscriptionId },
        data: { lastRunAt: new Date() },
      });

      // 13. 触发通知（Webhook + Email）
      try {
        await this.notificationService.onRunCompleted({
          runId,
          subscriptionId,
          userId,
          status: 'completed',
          itemsDelivered: deliveredIds.length,
          narrativeMarkdown,
          items: selectedItems.map((item) => ({
            title: item.title,
            url: item.url,
            aiSummary: item.aiSummary,
            scoreOverall: item.scoreOverall,
          })),
        });
      } catch (notifyError) {
        // 通知失败不影响运行结果
        this.logger.warn(
          `Notification dispatch failed for run ${runId}:`,
          notifyError,
        );
      }

      this.logger.log(
        `Completed subscription run ${runId}: ${deliveredIds.length} items delivered`,
      );

      return { success: true, itemsDelivered: deliveredIds.length };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed subscription run ${runId}:`, error);

      await this.runService.failRun(runId, errorMessage);

      // 触发失败通知（仅 Webhook，不发 Email）
      try {
        await this.notificationService.onRunCompleted({
          runId,
          subscriptionId,
          userId,
          status: 'failed',
          itemsDelivered: 0,
          items: [],
          error: errorMessage,
        });
      } catch (notifyError) {
        this.logger.warn(
          `Failed notification dispatch for run ${runId}:`,
          notifyError,
        );
      }

      throw error;
    }
  }

  /**
   * 执行搜索
   */
  private async performSearch(
    userId: string,
    subscription: {
      topic: string;
      interests: string[];
      searchLimit: number;
    },
    billingBreakdown: BillingBreakdown,
  ): Promise<
    Array<{
      url: string;
      title: string;
      description?: string;
    }>
  > {
    // 构建搜索查询
    const query = [subscription.topic, ...subscription.interests]
      .filter(Boolean)
      .join(' ');

    // 调用搜索服务
    const response = await this.searchService.search(userId, {
      query,
      limit: subscription.searchLimit,
      scrapeResults: false, // 不自动抓取，我们会单独控制
    });

    // 记录计费
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
   * 处理和评分内容
   */
  private async processAndScoreContents(
    searchResults: Array<{
      url: string;
      title: string;
      description?: string;
    }>,
    scrapedContents: Map<
      string,
      { fulltext: string; siteName?: string; favicon?: string }
    >,
    subscription: {
      topic: string;
      interests: string[];
      negativeInterests?: string[];
    },
    locale: string,
    billingBreakdown: BillingBreakdown,
    feedbackPatterns?: FeedbackPatternForScoring[],
  ): Promise<
    Array<{
      contentId: string;
      canonicalUrlHash: string;
      url: string;
      title: string;
      aiSummary?: string;
      scoreRelevance: number;
      scoreOverall: number;
      scoringReason?: string;
      rank: number;
      isRedelivered: boolean;
    }>
  > {
    const scoredItems: Array<{
      contentId: string;
      canonicalUrlHash: string;
      url: string;
      title: string;
      aiSummary?: string;
      scoreRelevance: number;
      scoreOverall: number;
      scoringReason?: string;
      rank: number;
      isRedelivered: boolean;
    }> = [];

    for (const result of searchResults) {
      const scraped = scrapedContents.get(result.url);

      // 计算评分（先检查是否被屏蔽）
      const {
        score: relevance,
        reason,
        blocked,
      } = calculateRelevanceScore(
        {
          title: result.title,
          description: result.description,
          fulltext: scraped?.fulltext,
          url: result.url,
        },
        subscription,
        feedbackPatterns,
      );

      // 跳过被负面兴趣屏蔽的内容
      if (blocked) {
        this.logger.debug(`Blocked content: ${result.url} - ${reason}`);
        continue;
      }

      // 入池
      const content = await this.contentService.ingestContent({
        url: result.url,
        title: result.title,
        description: result.description,
        fulltext: scraped?.fulltext,
        siteName: scraped?.siteName,
        favicon: scraped?.favicon,
      });

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

      // 获取或创建 AI 摘要
      let enrichment = await this.contentService.getEnrichment(
        content.canonicalUrlHash,
        locale,
      );
      if (!enrichment && (scraped?.fulltext || result.description)) {
        // 调用 AI 生成摘要
        const { result: aiSummary } = await this.aiService.generateSummary(
          {
            title: result.title,
            description: result.description,
            fulltext: scraped?.fulltext,
            url: result.url,
          },
          locale,
          billingBreakdown,
        );
        enrichment = await this.contentService.createEnrichment(
          content.id,
          content.canonicalUrlHash,
          locale,
          aiSummary,
        );
      }

      scoredItems.push({
        contentId: content.id,
        canonicalUrlHash: content.canonicalUrlHash,
        url: result.url,
        title: result.title,
        aiSummary: enrichment?.aiSummary,
        scoreRelevance: relevance,
        scoreOverall: overall,
        scoringReason: reason,
        rank: 0, // 稍后排序
        isRedelivered: false,
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
   * 去重
   */
  private async deduplicateItems(
    items: Array<{
      contentId: string;
      canonicalUrlHash: string;
      url: string;
      title: string;
      aiSummary?: string;
      scoreRelevance: number;
      scoreOverall: number;
      scoringReason?: string;
      rank: number;
      isRedelivered: boolean;
    }>,
    subscription: {
      id: string;
      redeliveryPolicy: string;
      redeliveryCooldownDays: number;
    },
  ): Promise<{
    dedupedItems: typeof items;
    dedupSkipped: number;
    redelivered: number;
  }> {
    const dedupedItems: typeof items = [];
    let dedupSkipped = 0;
    let redelivered = 0;

    for (const item of items) {
      const { delivered, lastDeliveredAt } =
        await this.runService.isContentDelivered(
          subscription.id,
          item.canonicalUrlHash,
        );

      if (!delivered) {
        dedupedItems.push(item);
        continue;
      }

      // 根据重投策略处理
      switch (subscription.redeliveryPolicy) {
        case 'NEVER':
          dedupSkipped++;
          break;

        case 'COOLDOWN':
          if (lastDeliveredAt) {
            const cooldownMs =
              subscription.redeliveryCooldownDays * 24 * 60 * 60 * 1000;
            if (Date.now() - lastDeliveredAt.getTime() >= cooldownMs) {
              item.isRedelivered = true;
              dedupedItems.push(item);
              redelivered++;
            } else {
              dedupSkipped++;
            }
          } else {
            dedupSkipped++;
          }
          break;

        case 'ON_CONTENT_UPDATE':
          // TODO: 检查内容是否更新
          dedupSkipped++;
          break;

        default:
          dedupSkipped++;
      }
    }

    return { dedupedItems, dedupSkipped, redelivered };
  }

  /**
   * 筛选 Top N 条目
   */
  private selectTopItems(
    items: Array<{
      contentId: string;
      canonicalUrlHash: string;
      url: string;
      title: string;
      aiSummary?: string;
      scoreRelevance: number;
      scoreOverall: number;
      scoringReason?: string;
      rank: number;
      isRedelivered: boolean;
    }>,
    minItems: number,
    minScore: number,
  ): typeof items {
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
