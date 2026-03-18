import { describe, it, expect } from 'vitest';
import { generateSitemapXml } from '../sitemap';

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
});
