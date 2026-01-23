/**
 * Digest Site Crawl Service
 *
 * [INPUT]: Site URL, crawl 配置
 * [OUTPUT]: 解析后的页面内容列表
 * [POS]: 处理网站爬取，发现新内容并提取信息
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { MapService } from '../../map/map.service';
import { ScraperService } from '../../scraper/scraper.service';
import { UrlValidator } from '../../common/validators/url.validator';
import { SOURCE_DEFAULTS } from '../digest.constants';

/**
 * 爬取到的页面内容
 */
export interface CrawledPage {
  url: string;
  title: string;
  description?: string;
  fulltext?: string;
  publishedAt?: Date;
  author?: string;
  siteName?: string;
  favicon?: string;
}

/**
 * Site Crawl 源配置
 */
export interface SiteCrawlSourceConfig {
  siteUrl: string;
  maxPages?: number;
  includeSubdomains?: boolean;
  pathPatterns?: string[];
  scrapeContent?: boolean;
}

/**
 * Site Crawl 结果
 */
export interface SiteCrawlResult {
  pages: CrawledPage[];
  discoveredUrls: string[];
  crawledCount: number;
  errorCount: number;
}

@Injectable()
export class DigestSiteCrawlService {
  private readonly logger = new Logger(DigestSiteCrawlService.name);

  constructor(
    private readonly mapService: MapService,
    private readonly scraperService: ScraperService,
    private readonly urlValidator: UrlValidator,
  ) {}

  /**
   * 爬取网站并提取内容
   */
  async crawlSite(
    userId: string,
    config: SiteCrawlSourceConfig,
  ): Promise<SiteCrawlResult> {
    const {
      siteUrl,
      maxPages = SOURCE_DEFAULTS.siteCrawlMaxPages,
      includeSubdomains = false,
      pathPatterns,
      scrapeContent = true,
    } = config;

    this.logger.debug(`Starting site crawl: ${siteUrl}`);

    const pages: CrawledPage[] = [];
    let errorCount = 0;

    try {
      if (!(await this.urlValidator.isAllowed(siteUrl))) {
        throw new Error(`Site URL not allowed: ${siteUrl}`);
      }

      // 1. 使用 MapService 发现网站 URL
      const mapResult = await this.mapService.map(userId, {
        url: siteUrl,
        limit: maxPages * 3, // 多发现一些以便过滤
        includeSubdomains,
        ignoreSitemap: false, // 使用 sitemap 以获取更多 URL
      });

      this.logger.debug(`Discovered ${mapResult.links.length} URLs`);

      // 2. 过滤符合路径模式的 URL
      let filteredUrls = mapResult.links;
      if (pathPatterns && pathPatterns.length > 0) {
        filteredUrls = this.filterByPathPatterns(mapResult.links, pathPatterns);
        this.logger.debug(
          `Filtered to ${filteredUrls.length} URLs matching path patterns`,
        );
      }

      // 3. 限制爬取数量
      const urlsToCrawl = filteredUrls.slice(0, maxPages);

      // 4. 抓取每个页面内容
      if (scrapeContent) {
        for (const url of urlsToCrawl) {
          try {
            const page = await this.scrapePage(userId, url);
            if (page) {
              pages.push(page);
            }
          } catch (error) {
            this.logger.warn(`Failed to scrape ${url}:`, error);
            errorCount++;
          }
        }
      } else {
        // 不抓取内容，只返回 URL 和基本信息
        for (const url of urlsToCrawl) {
          pages.push({
            url,
            title: this.extractTitleFromUrl(url),
          });
        }
      }

      this.logger.debug(`Crawled ${pages.length} pages successfully`);

      return {
        pages,
        discoveredUrls: mapResult.links,
        crawledCount: pages.length,
        errorCount,
      };
    } catch (error) {
      this.logger.error(`Failed to crawl site ${siteUrl}:`, error);
      throw error;
    }
  }

  /**
   * 抓取单个页面
   */
  private async scrapePage(
    userId: string,
    url: string,
  ): Promise<CrawledPage | null> {
    try {
      const result = await this.scraperService.scrapeSync(userId, {
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 30000,
        mobile: false,
        darkMode: false,
      });

      if (!result.metadata?.title) {
        return null;
      }

      return {
        url,
        title: result.metadata.title,
        description: result.metadata.description || undefined,
        fulltext: result.markdown || undefined,
        publishedAt: result.metadata.publishedTime
          ? new Date(result.metadata.publishedTime)
          : undefined,
        author: result.metadata.author || undefined,
        siteName: result.metadata.ogSiteName || undefined,
        favicon: result.metadata.favicon || undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to scrape page ${url}:`, error);
      return null;
    }
  }

  /**
   * 根据路径模式过滤 URL
   */
  private filterByPathPatterns(urls: string[], patterns: string[]): string[] {
    return urls.filter((url) => {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;

        return patterns.some((pattern) => this.matchPattern(path, pattern));
      } catch {
        return false;
      }
    });
  }

  /**
   * 简单的路径模式匹配
   * 支持 * 通配符
   */
  private matchPattern(path: string, pattern: string): boolean {
    // 转换模式为正则表达式
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
      .replace(/\*/g, '.*'); // * 转换为 .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * 从 URL 提取标题（用于不抓取内容的情况）
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // 移除扩展名和斜杠，转换为可读标题
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 0) {
        return urlObj.hostname;
      }

      const lastSegment = segments[segments.length - 1];
      return lastSegment
        .replace(/\.[^/.]+$/, '') // 移除扩展名
        .replace(/[-_]/g, ' ') // 连字符和下划线转空格
        .replace(/\b\w/g, (c) => c.toUpperCase()); // 首字母大写
    } catch {
      return url;
    }
  }
}
