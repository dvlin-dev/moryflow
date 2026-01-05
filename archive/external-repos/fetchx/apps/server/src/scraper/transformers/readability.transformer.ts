// apps/server/src/scraper/transformers/readability.transformer.ts
/**
 * [INPUT]: Raw HTML string + URL + ExtractOptions
 * [OUTPUT]: Cleaned main content HTML with optimized URLs
 * [POS]: Content extraction service, uses Firecrawl-style subtractive approach
 *
 * [PROTOCOL]: When this file changes, update this header and src/scraper/AGENTS.md
 */
import { Injectable } from '@nestjs/common';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

import {
  MIN_CONTENT_LENGTH,
  READABILITY_CHAR_THRESHOLD,
  NOISE_SELECTORS,
  FORCE_INCLUDE_SELECTORS,
  FALLBACK_SELECTORS,
  SITE_RULES,
} from './readability.constants';
import type { ExtractOptions } from './readability.types';

export type { ExtractOptions } from './readability.types';

@Injectable()
export class ReadabilityTransformer {
  /**
   * Extract main content from HTML
   *
   * Strategy (Firecrawl-inspired):
   * 1. Apply includeTags filter if specified
   * 2. Apply excludeTags removal if specified
   * 3. Try site-specific rules
   * 4. Remove noise elements (subtractive approach)
   * 5. Use Readability on cleaned HTML
   * 6. Fallback to semantic selectors
   * 7. Return cleaned body as last resort
   */
  async extract(
    html: string,
    url: string,
    options?: ExtractOptions,
  ): Promise<string> {
    // Validate URL for JSDOM (falls back to empty document context if invalid)
    let validatedUrl: string;
    try {
      validatedUrl = new URL(url).href;
    } catch {
      validatedUrl = 'about:blank';
    }

    const baseUrl = options?.baseUrl || validatedUrl;
    let document = new JSDOM(html, { url: validatedUrl }).window.document;

    // 1. Apply includeTags filter
    if (options?.includeTags?.length) {
      document = this.filterByIncludeTags(
        document,
        options.includeTags,
        validatedUrl,
      );
    }

    // 2. Apply excludeTags removal
    if (options?.excludeTags?.length) {
      this.removeBySelectors(document, options.excludeTags);
    }

    // 3. Try site-specific rules
    const siteContent = this.extractBySiteRule(document, validatedUrl);
    if (siteContent) {
      return this.finalizeContent(siteContent, validatedUrl, baseUrl);
    }

    // 4. Remove noise elements
    this.removeNoiseElements(document);

    // 5. Try Readability extraction
    const readabilityContent = this.extractByReadability(document, baseUrl);
    if (readabilityContent) {
      return this.finalizeContent(readabilityContent, validatedUrl, baseUrl);
    }

    // 6. Try fallback selectors
    const fallbackContent = this.extractByFallbackSelectors(document);
    if (fallbackContent) {
      return this.finalizeContent(fallbackContent, validatedUrl, baseUrl);
    }

    // 7. Return cleaned body
    this.absolutizeUrls(document, baseUrl);
    return document.body?.innerHTML || '';
  }

  // ==========================================================================
  // Extraction Methods
  // ==========================================================================

  private extractBySiteRule(document: Document, url: string): string | null {
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return null;
    }

    const rule = SITE_RULES.find((r) => hostname.includes(r.domain));
    if (!rule) return null;

    const content = document.querySelector(rule.contentSelector);
    const html = content?.innerHTML;
    return html && html.trim().length > MIN_CONTENT_LENGTH ? html : null;
  }

  private extractByReadability(
    document: Document,
    baseUrl: string,
  ): string | null {
    const dom = new JSDOM(document.documentElement.outerHTML, { url: baseUrl });
    const reader = new Readability(dom.window.document, {
      charThreshold: READABILITY_CHAR_THRESHOLD,
      classesToPreserve: ['highlight', 'code', 'pre'],
    });

    const article = reader.parse();
    return article?.content && article.content.trim().length > MIN_CONTENT_LENGTH
      ? article.content
      : null;
  }

  private extractByFallbackSelectors(document: Document): string | null {
    for (const selector of FALLBACK_SELECTORS) {
      const element = document.querySelector(selector);
      if (
        element?.textContent &&
        element.textContent.length > MIN_CONTENT_LENGTH
      ) {
        return element.innerHTML;
      }
    }
    return null;
  }

  // ==========================================================================
  // DOM Manipulation Methods
  // ==========================================================================

  private filterByIncludeTags(
    document: Document,
    includeTags: string[],
    url: string,
  ): Document {
    const newDoc = new JSDOM('<html><head></head><body></body></html>', { url })
      .window.document;

    for (const selector of includeTags) {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          newDoc.body.appendChild(newDoc.importNode(el.cloneNode(true), true));
        });
      } catch {
        // Invalid selector - skip
      }
    }

    return newDoc;
  }

  private removeBySelectors(document: Document, selectors: string[]): void {
    for (const selector of selectors) {
      try {
        document.querySelectorAll(selector).forEach((el) => el.remove());
      } catch {
        // Invalid selector - skip
      }
    }
  }

  private removeNoiseElements(document: Document): void {
    // Collect protected elements
    const protectedElements = new Set<Element>();
    for (const selector of FORCE_INCLUDE_SELECTORS) {
      document.querySelectorAll(selector).forEach((el) => {
        protectedElements.add(el);
      });
    }

    // Remove noise elements (skip if contains or is protected)
    for (const selector of NOISE_SELECTORS) {
      document.querySelectorAll(selector).forEach((el) => {
        const containsProtected = Array.from(protectedElements).some((p) =>
          el.contains(p),
        );
        if (!containsProtected && !protectedElements.has(el)) {
          el.remove();
        }
      });
    }

    // Remove non-content elements
    document
      .querySelectorAll('script, style, noscript, iframe, svg')
      .forEach((el) => el.remove());
  }

  // ==========================================================================
  // URL Processing Methods
  // ==========================================================================

  private finalizeContent(
    html: string,
    url: string,
    baseUrl: string,
  ): string {
    const doc = new JSDOM(html, { url }).window.document;
    this.absolutizeUrls(doc, baseUrl);
    return doc.body?.innerHTML || html;
  }

  private absolutizeUrls(document: Document, baseUrl: string): void {
    this.optimizeSrcset(document, baseUrl);
    this.absolutizeImageSrc(document, baseUrl);
    this.absolutizeAnchorHref(document, baseUrl);
  }

  private optimizeSrcset(document: Document, baseUrl: string): void {
    document.querySelectorAll('img[srcset]').forEach((img) => {
      const srcset = img.getAttribute('srcset');
      if (!srcset) return;

      const entries = this.parseSrcset(srcset);
      if (entries.length === 0) return;

      // Select largest by size
      entries.sort((a, b) => b.size - a.size);
      const bestUrl = entries[0].url;

      try {
        img.setAttribute('src', new URL(bestUrl, baseUrl).href);
      } catch {
        img.setAttribute('src', bestUrl);
      }
    });
  }

  private absolutizeImageSrc(document: Document, baseUrl: string): void {
    document.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src || this.isAbsoluteOrSpecialUrl(src)) return;

      try {
        img.setAttribute('src', new URL(src, baseUrl).href);
      } catch {
        // Invalid URL - skip
      }
    });
  }

  private absolutizeAnchorHref(document: Document, baseUrl: string): void {
    document.querySelectorAll('a[href]').forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href || this.isAbsoluteOrSpecialUrl(href) || href.startsWith('#')) {
        return;
      }

      try {
        anchor.setAttribute('href', new URL(href, baseUrl).href);
      } catch {
        // Invalid URL - skip
      }
    });
  }

  private isAbsoluteOrSpecialUrl(url: string): boolean {
    return (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:') ||
      url.startsWith('blob:') ||
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.startsWith('javascript:')
    );
  }

  private parseSrcset(srcset: string): Array<{ url: string; size: number }> {
    return srcset
      .split(',')
      .map((part) => {
        const tokens = part.trim().split(/\s+/);
        if (tokens.length === 0 || !tokens[0]) return null;

        const url = tokens[0];
        let size = 1;

        if (tokens.length > 1) {
          const descriptor = tokens[tokens.length - 1];
          if (descriptor.endsWith('x') || descriptor.endsWith('w')) {
            size = parseFloat(descriptor.slice(0, -1)) || 1;
          }
        }

        return { url, size };
      })
      .filter((entry): entry is { url: string; size: number } => entry !== null);
  }
}
