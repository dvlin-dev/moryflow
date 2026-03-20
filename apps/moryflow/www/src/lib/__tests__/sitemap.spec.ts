import { describe, it, expect } from 'vitest';
import { generateSitemapXml } from '../sitemap';
import { getIndexablePages } from '../site-pages';
import { getAllArticles } from '../geo-articles';

describe('generateSitemapXml', () => {
  it('renders core product pages', () => {
    const body = generateSitemapXml();
    expect(body).toContain('<loc>https://moryflow.com/</loc>');
    expect(body).toContain('<loc>https://moryflow.com/download</loc>');
    expect(body).toContain('<loc>https://moryflow.com/pricing</loc>');
    expect(body).not.toContain('<loc>https://moryflow.com/features</loc>');
    expect(body).not.toContain('<loc>https://moryflow.com/use-cases</loc>');
    expect(body).not.toContain('<loc>https://moryflow.com/about</loc>');
  });

  it('renders SEO landing pages', () => {
    const body = generateSitemapXml();
    expect(body).toContain('<loc>https://moryflow.com/agent-workspace</loc>');
    expect(body).toContain('<loc>https://moryflow.com/telegram-ai-agent</loc>');
    expect(body).toContain('<loc>https://moryflow.com/local-first-ai-notes</loc>');
  });

  it('renders compare pages', () => {
    const body = generateSitemapXml();
    expect(body).toContain('<loc>https://moryflow.com/compare/notion</loc>');
    expect(body).toContain('<loc>https://moryflow.com/compare/openclaw</loc>');
  });

  it('renders Chinese locale variants for all pages', () => {
    const body = generateSitemapXml();
    expect(body).toContain('<loc>https://moryflow.com/zh</loc>');
    expect(body).toContain('<loc>https://moryflow.com/zh/download</loc>');
    expect(body).toContain('<loc>https://moryflow.com/zh/pricing</loc>');
    expect(body).toContain('<loc>https://moryflow.com/zh/privacy</loc>');
    expect(body).toContain('<loc>https://moryflow.com/zh/agent-workspace</loc>');
    expect(body).not.toContain('<loc>https://moryflow.com/zh/features</loc>');
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
    expect(body).toContain('hreflang="x-default" href="https://moryflow.com/"');
    expect(body).toContain('hreflang="x-default" href="https://moryflow.com/download"');
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

  it('blog article lastModified matches frontmatter updatedAt or publishedAt', () => {
    const pages = getIndexablePages();
    const articles = getAllArticles();

    for (const article of articles) {
      const page = pages.find((p) => p.id === `blog-${article.slug}`);
      const fm = article.content.en.frontmatter;
      const expected = fm.updatedAt ?? fm.publishedAt;
      expect(page, `page for blog-${article.slug} not found`).toBeDefined();
      expect(page!.lastModified).toBe(expected);
    }
  });
});
