/**
 * Digest Source Service
 *
 * [INPUT]: SubscriptionId, 源配置
 * [OUTPUT]: 来自多个源的内容候选
 * [POS]: 统一处理多源内容获取，支持 Search、RSS、Site Crawl
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DigestRssService, type RssSourceConfig } from './rss.service';
import { DigestContentService } from './content.service';
import { SOURCE_DEFAULTS } from '../digest.constants';

/**
 * 源内容候选
 */
export interface SourceContent {
  url: string;
  title: string;
  description?: string;
  fulltext?: string;
  publishedAt?: Date;
  author?: string;
  siteName?: string;
  favicon?: string;
  sourceType: 'search' | 'rss' | 'siteCrawl';
  sourceId?: string;
  weight?: number;
}

@Injectable()
export class DigestSourceService {
  private readonly logger = new Logger(DigestSourceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rssService: DigestRssService,
    private readonly contentService: DigestContentService,
  ) {}

  /**
   * 获取订阅的所有源内容（不含 Search，Search 在 processor 中单独处理）
   *
   * 该方法从订阅关联的非搜索源（RSS、Site Crawl）获取内容
   * 内容窗口期过滤：只返回 contentWindowHours 内的内容
   */
  async fetchSourceContents(
    subscriptionId: string,
    contentWindowHours: number = SOURCE_DEFAULTS.contentWindowHours,
  ): Promise<SourceContent[]> {
    const contents: SourceContent[] = [];

    // 1. 获取订阅关联的所有启用源
    const subscriptionSources =
      await this.prisma.digestSubscriptionSource.findMany({
        where: {
          subscriptionId,
          enabled: true,
        },
        include: {
          source: true,
        },
      });

    this.logger.debug(
      `Found ${subscriptionSources.length} sources for subscription ${subscriptionId}`,
    );

    // 计算内容窗口起始时间
    const windowStart = new Date(
      Date.now() - contentWindowHours * 60 * 60 * 1000,
    );

    // 2. 根据源类型获取内容
    for (const subSource of subscriptionSources) {
      const { source, weight } = subSource;

      try {
        switch (source.type) {
          case 'rss': {
            const rssContents = await this.fetchRssContents(
              source.id,
              source.config as unknown as RssSourceConfig,
              weight ?? SOURCE_DEFAULTS.weight,
              windowStart,
            );
            contents.push(...rssContents);
            break;
          }

          case 'siteCrawl':
            // Site Crawl 内容通过 SourceRefreshProcessor 预先入池到 ContentItem
            // 订阅运行时通过 Search 或其他途径获取，此处跳过
            this.logger.debug(
              `Site Crawl source ${source.id} content pre-ingested via SourceRefreshProcessor`,
            );
            break;

          case 'search':
            // Search 类型在 processor 中单独处理，不在这里
            this.logger.debug(`Skipping search source ${source.id}`);
            break;

          default: {
            const unknownType: string = source.type;
            this.logger.warn(`Unknown source type: ${unknownType}`);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to fetch contents from source ${source.id}:`,
          error,
        );
        // 继续处理其他源，不中断
      }
    }

    this.logger.debug(
      `Fetched ${contents.length} contents from non-search sources`,
    );

    return contents;
  }

  /**
   * 从 RSS 源获取内容
   */
  private async fetchRssContents(
    sourceId: string,
    config: RssSourceConfig,
    weight: number,
    windowStart: Date,
  ): Promise<SourceContent[]> {
    const { feedUrl, maxItems = SOURCE_DEFAULTS.rssMaxItems } = config;

    this.logger.debug(`Fetching RSS content: ${feedUrl}`);

    try {
      const rssResult = await this.rssService.fetchAndParse({
        feedUrl,
        maxItems,
      });

      // 过滤时间窗口内的内容
      const contents: SourceContent[] = [];
      for (const item of rssResult.items) {
        // 如果有发布时间，检查是否在窗口内
        if (item.pubDate && item.pubDate < windowStart) {
          continue;
        }

        // 入池内容（确保全局去重）
        await this.contentService.ingestContent({
          url: item.url,
          title: item.title,
          description: item.description,
          publishedAt: item.pubDate,
          author: item.author,
        });

        contents.push({
          url: item.url,
          title: item.title,
          description: item.description,
          publishedAt: item.pubDate,
          author: item.author,
          sourceType: 'rss',
          sourceId,
          weight,
        });
      }

      this.logger.debug(`Fetched ${contents.length} items from RSS ${feedUrl}`);

      return contents;
    } catch (error) {
      this.logger.error(`Failed to fetch RSS ${feedUrl}:`, error);
      return [];
    }
  }

  /**
   * 合并搜索结果和源内容
   *
   * 对来自不同源的内容进行合并和去重
   */
  mergeContents(
    searchResults: Array<{
      url: string;
      title: string;
      description?: string;
    }>,
    sourceContents: SourceContent[],
  ): SourceContent[] {
    const seen = new Set<string>();
    const merged: SourceContent[] = [];

    // 先添加搜索结果
    for (const result of searchResults) {
      if (!seen.has(result.url)) {
        seen.add(result.url);
        merged.push({
          ...result,
          sourceType: 'search',
          weight: SOURCE_DEFAULTS.weight,
        });
      }
    }

    // 再添加其他源内容
    for (const content of sourceContents) {
      if (!seen.has(content.url)) {
        seen.add(content.url);
        merged.push(content);
      }
    }

    return merged;
  }
}
