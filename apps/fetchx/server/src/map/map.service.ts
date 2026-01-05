/**
 * [INPUT]: MapOptions - URL, search filter, limit, subdomain config
 * [OUTPUT]: MapResult - Array of discovered URLs
 * [POS]: Core URL discovery logic - sitemap parsing and link crawling
 *
 * [PROTOCOL]: When this file changes, update this header and src/map/CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SitemapParser } from './sitemap-parser';
import { BrowserPool } from '../browser/browser-pool';
import { UrlValidator } from '../common/validators/url.validator';
import type { MapOptions, MapResult } from './dto/map.dto';

/** 默认最大爬取页面数 */
const DEFAULT_MAX_CRAWL_PAGES = 100;

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);
  private readonly maxCrawlPages: number;

  constructor(
    private sitemapParser: SitemapParser,
    private browserPool: BrowserPool,
    private urlValidator: UrlValidator,
    private config: ConfigService,
  ) {
    this.maxCrawlPages =
      config.get('MAP_MAX_CRAWL_PAGES') || DEFAULT_MAX_CRAWL_PAGES;
  }

  /**
   * 映射网站 URL
   */
  async map(options: MapOptions): Promise<MapResult> {
    const {
      url,
      search,
      limit = 5000,
      ignoreSitemap = false,
      includeSubdomains = false,
    } = options;

    // SSRF 防护
    if (!this.urlValidator.isAllowed(url)) {
      throw new Error('URL not allowed: possible SSRF attack');
    }

    const baseUrl = new URL(url);
    const baseHost = baseUrl.hostname;
    const seen = new Set<string>();
    const results: string[] = [];

    // 1. 从 sitemap 获取 URL
    if (!ignoreSitemap) {
      try {
        const sitemapUrls = await this.sitemapParser.fetchAndParse(
          baseUrl.origin,
        );
        this.logger.debug(`Found ${sitemapUrls.length} URLs from sitemap`);

        for (const entry of sitemapUrls) {
          if (results.length >= limit) break;
          if (
            this.isValidUrl(entry.url, baseHost, includeSubdomains) &&
            !seen.has(entry.url)
          ) {
            if (
              !search ||
              entry.url.toLowerCase().includes(search.toLowerCase())
            ) {
              seen.add(entry.url);
              results.push(entry.url);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to parse sitemap: ${error}`);
      }
    }

    // 2. 如果 sitemap 不够，通过爬取发现更多
    if (results.length < limit) {
      const crawledUrls = await this.crawlForUrls(
        url,
        limit - results.length,
        seen,
        baseHost,
        includeSubdomains,
        search,
      );
      results.push(...crawledUrls);
    }

    return {
      links: results,
      count: results.length,
    };
  }

  /**
   * 通过爬取发现 URL
   */
  private async crawlForUrls(
    startUrl: string,
    limit: number,
    seen: Set<string>,
    baseHost: string,
    includeSubdomains: boolean,
    search?: string,
  ): Promise<string[]> {
    const results: string[] = [];
    const queue = [startUrl];
    const maxPages = Math.min(limit, this.maxCrawlPages);

    const context = await this.browserPool.acquireContext();
    const page = await context.newPage();

    try {
      let pagesVisited = 0;

      while (
        queue.length > 0 &&
        results.length < limit &&
        pagesVisited < maxPages
      ) {
        const url = queue.shift()!;

        if (seen.has(url)) continue;
        seen.add(url);

        try {
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          });
          pagesVisited++;

          // 提取所有链接
          const links = await page.$$eval('a[href]', (elements) =>
            elements
              .map((el) => (el as HTMLAnchorElement).href)
              .filter(Boolean),
          );

          for (const link of links) {
            if (results.length >= limit) break;
            if (
              this.isValidUrl(link, baseHost, includeSubdomains) &&
              !seen.has(link)
            ) {
              if (
                !search ||
                link.toLowerCase().includes(search.toLowerCase())
              ) {
                seen.add(link);
                results.push(link);
                queue.push(link);
              }
            }
          }
        } catch {
          // 页面加载失败，继续下一个
          continue;
        }
      }
    } finally {
      await page.close().catch(() => {});
      await this.browserPool.releaseContext(context);
    }

    return results;
  }

  /**
   * 验证 URL 是否有效
   */
  private isValidUrl(
    url: string,
    baseHost: string,
    includeSubdomains: boolean,
  ): boolean {
    try {
      const urlObj = new URL(url);

      // 只允许 http/https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // 排除资源文件
      const excludedExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.svg',
        '.webp',
        '.ico',
        '.css',
        '.js',
        '.woff',
        '.woff2',
        '.ttf',
        '.eot',
        '.pdf',
        '.zip',
        '.tar',
        '.gz',
      ];
      const path = urlObj.pathname.toLowerCase();
      if (excludedExtensions.some((ext) => path.endsWith(ext))) {
        return false;
      }

      // 检查域名
      if (includeSubdomains) {
        return (
          urlObj.hostname === baseHost ||
          urlObj.hostname.endsWith(`.${baseHost}`)
        );
      } else {
        return urlObj.hostname === baseHost;
      }
    } catch {
      return false;
    }
  }
}
