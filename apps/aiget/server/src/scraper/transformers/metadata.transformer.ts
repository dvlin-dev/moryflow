/**
 * [PROVIDES]: extract(html, url) - Page metadata extraction
 * [DEPENDS]: jsdom - HTML parsing
 * [POS]: Extracts title, description, OG tags, icons from HTML
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/CLAUDE.md
 */
import { Injectable } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import type { PageMetadata } from '../scraper.types';

@Injectable()
export class MetadataTransformer {
  extract(html: string, url: string): PageMetadata {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    const baseUrl = new URL(url);

    const metadata: PageMetadata = {};

    // 基础元数据
    metadata.title = this.getTitle(document);
    metadata.description = this.getMeta(document, 'description');
    metadata.author = this.getMeta(document, 'author');
    metadata.keywords = this.getKeywords(document);
    metadata.language = this.getLanguage(document);
    metadata.publishedTime = this.getMeta(document, 'article:published_time');
    metadata.modifiedTime = this.getMeta(document, 'article:modified_time');

    // Open Graph
    metadata.ogTitle = this.getMeta(document, 'og:title');
    metadata.ogDescription = this.getMeta(document, 'og:description');
    metadata.ogImage = this.resolveUrl(
      this.getMeta(document, 'og:image'),
      baseUrl,
    );
    metadata.ogType = this.getMeta(document, 'og:type');
    metadata.ogUrl = this.getMeta(document, 'og:url');
    metadata.ogSiteName = this.getMeta(document, 'og:site_name');

    // Twitter Card
    metadata.twitterCard = this.getMeta(document, 'twitter:card');
    metadata.twitterTitle = this.getMeta(document, 'twitter:title');
    metadata.twitterDescription = this.getMeta(document, 'twitter:description');
    metadata.twitterImage = this.resolveUrl(
      this.getMeta(document, 'twitter:image'),
      baseUrl,
    );

    // 其他
    metadata.favicon = this.getFavicon(document, baseUrl);
    metadata.canonicalUrl = this.getCanonicalUrl(document);
    metadata.robots = this.getMeta(document, 'robots');

    // 清理 undefined 值
    return Object.fromEntries(
      Object.entries(metadata).filter(([, v]) => v !== undefined),
    ) as PageMetadata;
  }

  private getTitle(document: Document): string | undefined {
    // 优先使用 og:title
    const ogTitle = this.getMeta(document, 'og:title');
    if (ogTitle) return ogTitle;

    // 然后使用 title 标签
    const title = document.querySelector('title')?.textContent?.trim();
    if (title) return title;

    // 最后尝试 h1
    const h1 = document.querySelector('h1')?.textContent?.trim();
    return h1;
  }

  private getMeta(document: Document, name: string): string | undefined {
    // 尝试 name 属性
    let element = document.querySelector(`meta[name="${name}"]`);
    if (element) {
      return element.getAttribute('content') || undefined;
    }

    // 尝试 property 属性 (Open Graph)
    element = document.querySelector(`meta[property="${name}"]`);
    if (element) {
      return element.getAttribute('content') || undefined;
    }

    return undefined;
  }

  private getKeywords(document: Document): string[] | undefined {
    const keywords = this.getMeta(document, 'keywords');
    if (!keywords) return undefined;
    return keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
  }

  private getLanguage(document: Document): string | undefined {
    return (
      document.documentElement.getAttribute('lang') ||
      this.getMeta(document, 'language') ||
      undefined
    );
  }

  private getFavicon(document: Document, baseUrl: URL): string | undefined {
    // 尝试各种 favicon 选择器
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
    ];

    for (const selector of selectors) {
      const link = document.querySelector(selector);
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          return this.resolveUrl(href, baseUrl);
        }
      }
    }

    // 默认尝试 /favicon.ico
    return `${baseUrl.origin}/favicon.ico`;
  }

  private getCanonicalUrl(document: Document): string | undefined {
    const link = document.querySelector('link[rel="canonical"]');
    return link?.getAttribute('href') || undefined;
  }

  private resolveUrl(
    url: string | undefined,
    baseUrl: URL,
  ): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `${baseUrl.protocol}${url}`;
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return undefined;
    }
  }
}
