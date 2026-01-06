/**
 * [PROVIDES]: fetchAndParse(baseUrl) - Fetch and parse sitemap.xml
 * [DEPENDS]: fast-xml-parser - XML parsing library
 * [POS]: Sitemap parser supporting index files and robots.txt references
 *
 * [PROTOCOL]: When this file changes, update this header and src/map/CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import type { SitemapEntry } from './dto/map.dto';

/**
 * fast-xml-parser 解析结果的类型定义
 */
interface SitemapUrl {
  loc?: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

interface SitemapIndexEntry {
  loc?: string;
}

interface ParsedSitemap {
  sitemapindex?: {
    sitemap?: SitemapIndexEntry | SitemapIndexEntry[];
  };
  urlset?: {
    url?: SitemapUrl | SitemapUrl[];
  };
}

@Injectable()
export class SitemapParser {
  private readonly logger = new Logger(SitemapParser.name);
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
  }

  /**
   * 从网站获取并解析 sitemap
   */
  async fetchAndParse(baseUrl: string): Promise<SitemapEntry[]> {
    const urls: SitemapEntry[] = [];

    // 尝试常见的 sitemap 位置
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/sitemap/sitemap.xml`,
    ];

    for (const sitemapUrl of sitemapUrls) {
      try {
        const entries = await this.parseSitemapUrl(sitemapUrl);
        urls.push(...entries);
        if (entries.length > 0) {
          this.logger.debug(`Found ${entries.length} URLs in ${sitemapUrl}`);
          break;
        }
      } catch {
        continue;
      }
    }

    // 尝试从 robots.txt 获取 sitemap
    try {
      const robotsUrl = `${baseUrl}/robots.txt`;
      const response = await fetch(robotsUrl, {
        signal: AbortSignal.timeout(10000),
      });
      const text = await response.text();
      const sitemapMatches = text.match(/Sitemap:\s*(.+)/gi);

      if (sitemapMatches) {
        for (const match of sitemapMatches) {
          const url = match.replace(/Sitemap:\s*/i, '').trim();
          try {
            const entries = await this.parseSitemapUrl(url);
            urls.push(...entries);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    // 去重
    const uniqueUrls = new Map<string, SitemapEntry>();
    for (const entry of urls) {
      if (!uniqueUrls.has(entry.url)) {
        uniqueUrls.set(entry.url, entry);
      }
    }

    return Array.from(uniqueUrls.values());
  }

  /**
   * 解析单个 sitemap URL
   */
  private async parseSitemapUrl(url: string): Promise<SitemapEntry[]> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status}`);
    }

    const xml = await response.text();
    return this.parseXml(xml);
  }

  /**
   * 解析 XML 内容
   */
  private async parseXml(xml: string): Promise<SitemapEntry[]> {
    const result = this.parser.parse(xml) as ParsedSitemap;
    const entries: SitemapEntry[] = [];

    // 处理 sitemap index
    if (result.sitemapindex?.sitemap) {
      const sitemaps = Array.isArray(result.sitemapindex.sitemap)
        ? result.sitemapindex.sitemap
        : [result.sitemapindex.sitemap];

      // 递归解析子 sitemap（限制并发）
      const childPromises = sitemaps
        .slice(0, 10) // 限制最多解析 10 个子 sitemap
        .map(async (sitemap) => {
          if (sitemap.loc) {
            try {
              return await this.parseSitemapUrl(sitemap.loc);
            } catch {
              return [];
            }
          }
          return [];
        });

      const childResults = await Promise.all(childPromises);
      for (const childEntries of childResults) {
        entries.push(...childEntries);
      }
    }

    // 处理 urlset
    if (result.urlset?.url) {
      const urls = Array.isArray(result.urlset.url)
        ? result.urlset.url
        : [result.urlset.url];

      for (const url of urls) {
        if (url.loc) {
          entries.push({
            url: url.loc,
            lastmod: url.lastmod,
            changefreq: url.changefreq,
            priority: url.priority ? parseFloat(url.priority) : undefined,
          });
        }
      }
    }

    return entries;
  }
}
