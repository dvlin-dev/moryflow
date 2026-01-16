/**
 * Digest RSS Service
 *
 * [INPUT]: RSS feed URL
 * [OUTPUT]: 解析后的 RSS 条目列表
 * [POS]: 处理 RSS/Atom feed 解析，支持 RSSHub 和自定义 feed
 */

import { Injectable, Logger } from '@nestjs/common';
import { UrlValidator } from '../../common/validators/url.validator';
import { SOURCE_DEFAULTS } from '../digest.constants';

/**
 * RSS 条目
 */
export interface RssItem {
  title: string;
  url: string;
  description?: string;
  pubDate?: Date;
  author?: string;
  categories?: string[];
  guid?: string;
}

/**
 * RSS Feed 元数据
 */
export interface RssFeedMeta {
  title?: string;
  description?: string;
  link?: string;
  language?: string;
  lastBuildDate?: Date;
}

/**
 * RSS 解析结果
 */
export interface RssParseResult {
  meta: RssFeedMeta;
  items: RssItem[];
}

/**
 * RSS 源配置
 */
export interface RssSourceConfig {
  feedUrl: string;
  maxItems?: number;
}

@Injectable()
export class DigestRssService {
  private readonly logger = new Logger(DigestRssService.name);

  constructor(private readonly urlValidator: UrlValidator) {}

  /**
   * 获取并解析 RSS feed
   */
  async fetchAndParse(config: RssSourceConfig): Promise<RssParseResult> {
    const { feedUrl, maxItems = SOURCE_DEFAULTS.rssMaxItems } = config;

    this.logger.debug(`Fetching RSS feed: ${feedUrl}`);

    try {
      if (!this.urlValidator.isAllowed(feedUrl)) {
        throw new Error(`Feed URL not allowed: ${feedUrl}`);
      }

      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Anyhunt-Digest/1.0 (+https://anyhunt.app)',
          Accept:
            'application/rss+xml, application/atom+xml, application/xml, text/xml',
        },
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xml = await response.text();
      return this.parseXml(xml, maxItems);
    } catch (error) {
      this.logger.error(`Failed to fetch RSS feed ${feedUrl}:`, error);
      throw error;
    }
  }

  /**
   * 解析 RSS/Atom XML
   */
  private parseXml(xml: string, maxItems: number): RssParseResult {
    // 检测是 RSS 还是 Atom
    const isAtom =
      xml.includes('<feed') &&
      xml.includes('xmlns="http://www.w3.org/2005/Atom"');

    if (isAtom) {
      return this.parseAtom(xml, maxItems);
    }

    return this.parseRss(xml, maxItems);
  }

  /**
   * 解析 RSS 2.0 格式
   */
  private parseRss(xml: string, maxItems: number): RssParseResult {
    const meta: RssFeedMeta = {};
    const items: RssItem[] = [];

    // 解析 channel 元数据
    const channelTitleMatch = xml.match(
      /<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/,
    );
    if (channelTitleMatch) {
      meta.title = this.cleanText(channelTitleMatch[1]);
    }

    const channelDescMatch = xml.match(
      /<channel>[\s\S]*?<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/,
    );
    if (channelDescMatch) {
      meta.description = this.cleanText(channelDescMatch[1]);
    }

    const channelLinkMatch = xml.match(
      /<channel>[\s\S]*?<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/,
    );
    if (channelLinkMatch) {
      meta.link = this.cleanText(channelLinkMatch[1]);
    }

    // 解析 items
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      if (items.length >= maxItems) break;

      const itemXml = match[1];
      const item = this.parseRssItem(itemXml);

      if (item.url && item.title) {
        items.push(item);
      }
    }

    this.logger.debug(`Parsed ${items.length} RSS items`);

    return { meta, items };
  }

  /**
   * 解析单个 RSS item
   */
  private parseRssItem(itemXml: string): RssItem {
    const item: RssItem = {
      title: '',
      url: '',
    };

    // title
    const titleMatch = itemXml.match(
      /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/,
    );
    if (titleMatch) {
      item.title = this.cleanText(titleMatch[1]);
    }

    // link
    const linkMatch = itemXml.match(
      /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/,
    );
    if (linkMatch) {
      item.url = this.cleanText(linkMatch[1]);
    }

    // description
    const descMatch = itemXml.match(
      /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/,
    );
    if (descMatch) {
      item.description = this.cleanText(descMatch[1]);
    }

    // pubDate
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (pubDateMatch) {
      const date = new Date(pubDateMatch[1].trim());
      if (!isNaN(date.getTime())) {
        item.pubDate = date;
      }
    }

    // author
    const authorMatch = itemXml.match(
      /<(?:author|dc:creator)>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:author|dc:creator)>/,
    );
    if (authorMatch) {
      item.author = this.cleanText(authorMatch[1]);
    }

    // categories
    const categoryMatches = itemXml.matchAll(
      /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g,
    );
    const categories: string[] = [];
    for (const catMatch of categoryMatches) {
      categories.push(this.cleanText(catMatch[1]));
    }
    if (categories.length > 0) {
      item.categories = categories;
    }

    // guid
    const guidMatch = itemXml.match(
      /<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/,
    );
    if (guidMatch) {
      item.guid = this.cleanText(guidMatch[1]);
    }

    return item;
  }

  /**
   * 解析 Atom 格式
   */
  private parseAtom(xml: string, maxItems: number): RssParseResult {
    const meta: RssFeedMeta = {};
    const items: RssItem[] = [];

    // 解析 feed 元数据
    const feedTitleMatch = xml.match(
      /<feed[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/,
    );
    if (feedTitleMatch) {
      meta.title = this.cleanText(feedTitleMatch[1]);
    }

    const feedSubtitleMatch = xml.match(
      /<subtitle[^>]*>([\s\S]*?)<\/subtitle>/,
    );
    if (feedSubtitleMatch) {
      meta.description = this.cleanText(feedSubtitleMatch[1]);
    }

    // 解析 entries
    const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

    for (const match of entryMatches) {
      if (items.length >= maxItems) break;

      const entryXml = match[1];
      const item = this.parseAtomEntry(entryXml);

      if (item.url && item.title) {
        items.push(item);
      }
    }

    this.logger.debug(`Parsed ${items.length} Atom entries`);

    return { meta, items };
  }

  /**
   * 解析单个 Atom entry
   */
  private parseAtomEntry(entryXml: string): RssItem {
    const item: RssItem = {
      title: '',
      url: '',
    };

    // title
    const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    if (titleMatch) {
      item.title = this.cleanText(titleMatch[1]);
    }

    // link (优先 rel="alternate")
    const linkMatch = entryXml.match(
      /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/,
    );
    if (linkMatch) {
      item.url = linkMatch[1];
    } else {
      const fallbackLinkMatch = entryXml.match(
        /<link[^>]*href=["']([^"']+)["']/,
      );
      if (fallbackLinkMatch) {
        item.url = fallbackLinkMatch[1];
      }
    }

    // summary/content
    const summaryMatch = entryXml.match(
      /<(?:summary|content)[^>]*>([\s\S]*?)<\/(?:summary|content)>/,
    );
    if (summaryMatch) {
      item.description = this.cleanText(summaryMatch[1]);
    }

    // published/updated
    const pubMatch = entryXml.match(
      /<(?:published|updated)>([\s\S]*?)<\/(?:published|updated)>/,
    );
    if (pubMatch) {
      const date = new Date(pubMatch[1].trim());
      if (!isNaN(date.getTime())) {
        item.pubDate = date;
      }
    }

    // author
    const authorMatch = entryXml.match(
      /<author>[\s\S]*?<name>([\s\S]*?)<\/name>/,
    );
    if (authorMatch) {
      item.author = this.cleanText(authorMatch[1]);
    }

    // categories
    const categoryMatches = entryXml.matchAll(
      /<category[^>]*term=["']([^"']+)["']/g,
    );
    const categories: string[] = [];
    for (const catMatch of categoryMatches) {
      categories.push(catMatch[1]);
    }
    if (categories.length > 0) {
      item.categories = categories;
    }

    // id
    const idMatch = entryXml.match(/<id>([\s\S]*?)<\/id>/);
    if (idMatch) {
      item.guid = this.cleanText(idMatch[1]);
    }

    return item;
  }

  /**
   * 清理文本（移除 HTML 标签、CDATA、多余空白）
   */
  private cleanText(text: string): string {
    return text
      .replace(/<!\[CDATA\[/g, '')
      .replace(/\]\]>/g, '')
      .replace(/<[^>]+>/g, '') // 移除 HTML 标签
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code: string) =>
        String.fromCharCode(parseInt(code, 10)),
      )
      .replace(/\s+/g, ' ')
      .trim();
  }
}
