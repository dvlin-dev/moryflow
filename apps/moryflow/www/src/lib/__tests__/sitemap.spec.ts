import { describe, it, expect } from 'vitest';
import { generateSitemapXml } from '../sitemap';
import { getIndexablePages } from '../site-pages';
import { getAllArticles } from '../geo-articles';

describe('generateSitemapXml', () => {
  it('renders core product pages', () => {
    const body = generateSitemapXml();
    expect(body).toContain('<loc>https://www.moryflow.com/</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/download</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/pricing</loc>');
    expect(body).not.toContain('<loc>https://www.moryflow.com/features</loc>');
    expect(body).not.toContain('<loc>https://www.moryflow.com/use-cases</loc>');
    expect(body).not.toContain('<loc>https://www.moryflow.com/about</loc>');
  });

  it('renders SEO landing pages', () => {
    const body = generateSitemapXml();
    expect(body).toContain('<loc>https://www.moryflow.com/agent-workspace</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/telegram-ai-agent</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/local-first-ai-notes</loc>');
  });

  it('renders compare pages', () => {
    const body = generateSitemapXml();
    expect(body).toContain('<loc>https://www.moryflow.com/compare/notion</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/compare/openclaw</loc>');
  });

  it('renders Chinese locale variants for all pages', () => {
    const body = generateSitemapXml();
    expect(body).toContain('<loc>https://www.moryflow.com/zh</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/zh/download</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/zh/pricing</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/zh/privacy</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/zh/agent-workspace</loc>');
    expect(body).not.toContain('<loc>https://www.moryflow.com/zh/features</loc>');
  });

  it('uses date-only lastmod format (no time component)', () => {
    const body = generateSitemapXml();
    expect(body).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
    expect(body).not.toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/);
  });

  it('includes xhtml:link hreflang alternates', () => {
    const body = generateSitemapXml();
    expect(body).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(body).toContain('xhtml:link rel="alternate" hreflang="en"');
    expect(body).toContain('xhtml:link rel="alternate" hreflang="zh-Hans"');
    expect(body).toContain('xhtml:link rel="alternate" hreflang="x-default"');
  });

  it('x-default points to English version', () => {
    const body = generateSitemapXml();
    expect(body).toContain('hreflang="x-default" href="https://www.moryflow.com/"');
    expect(body).toContain('hreflang="x-default" href="https://www.moryflow.com/download"');
  });

  it('all page definitions have lastModified', () => {
    const pages = getIndexablePages();
    for (const page of pages) {
      expect(page.lastModified, `page ${page.id} missing lastModified`).toBeTruthy();
    }
  });

  it('all lastModified values match YYYY-MM-DD format', () => {
    const pages = getIndexablePages();
    for (const page of pages) {
      expect(page.lastModified, `page ${page.id} has invalid lastModified`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      );
    }
  });

  it('sitemap XML lastmod tags all contain valid dates', () => {
    const body = generateSitemapXml();
    const lastmods = [...body.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map((m) => m[1]);
    expect(lastmods.length).toBeGreaterThan(0);
    for (const value of lastmods) {
      expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('blog article lastModified matches frontmatter publishedAt', () => {
    const pages = getIndexablePages();
    const articles = getAllArticles();

    for (const article of articles) {
      const page = pages.find((p) => p.id === `blog-${article.slug}`);
      expect(page, `page for blog-${article.slug} not found`).toBeDefined();
      expect(page!.lastModified).toBe(article.content.en.frontmatter.publishedAt);
    }
  });
});
