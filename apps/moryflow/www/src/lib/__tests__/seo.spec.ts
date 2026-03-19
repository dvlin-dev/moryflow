import { describe, it, expect } from 'vitest';
import { generateMeta, generateHreflangLinks, siteConfig } from '../seo';
import {
  getInvalidLocaleRedirectPath,
  getLocaleRedirectPath,
  getPageById,
  getPageByPath,
  getPageHref,
} from '../site-pages';
import { localePath } from '../i18n';

describe('seo', () => {
  it('uses canonical host for URLs', () => {
    expect(siteConfig.url).toBe('https://moryflow.com');
  });

  it('uses available Open Graph image', () => {
    expect(siteConfig.ogImage).toBe('https://moryflow.com/og-image.png');
  });

  it('builds locale-aware og:url from the configured base', () => {
    const meta = generateMeta({
      locale: 'zh',
      title: 'Download',
      path: '/download',
    }) as Array<{
      property?: string;
      content?: string;
    }>;
    const ogUrl = meta.find((item) => item.property === 'og:url')?.content;
    expect(ogUrl).toBe('https://moryflow.com/zh/download');
  });

  it('uses locale-specific og:locale', () => {
    const meta = generateMeta({
      locale: 'zh',
      title: 'Download',
      path: '/download',
    }) as Array<{
      property?: string;
      content?: string;
    }>;
    const ogLocale = meta.find((item) => item.property === 'og:locale')?.content;
    expect(ogLocale).toBe('zh_Hans_CN');
  });

  it('only emits hreflang links for published locales', () => {
    const links = generateHreflangLinks({ path: '/privacy', locale: 'en' });
    expect(links).toEqual([
      {
        rel: 'alternate',
        hreflang: 'en',
        href: 'https://moryflow.com/privacy',
      },
      {
        rel: 'alternate',
        hreflang: 'zh-Hans',
        href: 'https://moryflow.com/zh/privacy',
      },
      {
        rel: 'alternate',
        hreflang: 'x-default',
        href: 'https://moryflow.com/privacy',
      },
    ]);
  });
});

describe('site pages registry', () => {
  it('publishes all pages in zh', () => {
    expect(getPageById('home')?.locales.zh).toBe('published');
    expect(getPageById('download')?.locales.zh).toBe('published');
    expect(getPageById('pricing')?.locales.zh).toBe('published');
    expect(getPageById('agent-workspace')?.locales.zh).toBe('published');
    expect(getPageById('compare-openclaw')?.locales.zh).toBe('published');
    expect(getPageById('privacy')?.locales.zh).toBe('published');
  });

  it('finds pages by canonical path', () => {
    expect(getPageByPath('/download')?.id).toBe('download');
    expect(getPageByPath('/compare/openclaw')?.id).toBe('compare-openclaw');
  });

  it('generates locale-prefixed paths consistently', () => {
    expect(localePath('/download', 'en')).toBe('/download');
    expect(localePath('/download', 'zh')).toBe('/zh/download');
    expect(localePath('/', 'zh')).toBe('/zh');
  });

  it('keeps bilingual links in zh for all pages', () => {
    expect(getPageHref('/download', 'zh')).toBe('/zh/download');
    expect(getPageHref('/compare/notion', 'zh')).toBe('/zh/compare/notion');
    expect(getPageHref('/privacy', 'zh')).toBe('/zh/privacy');
  });

  it('returns null for all published locale pages (no redirects needed)', () => {
    expect(getLocaleRedirectPath('/zh/privacy', 'zh')).toBeNull();
    expect(getLocaleRedirectPath('/zh/agent-workspace', 'zh')).toBeNull();
    expect(getLocaleRedirectPath('/zh/download', 'zh')).toBeNull();
  });

  it('keeps English canonical paths unprefixed', () => {
    expect(getLocaleRedirectPath('/en/download', 'en')).toBeNull();
    expect(getPageHref('/download', 'en')).toBe('/download');
    expect(getPageHref('/', 'en')).toBe('/');
  });

  it('redirects deep paths with invalid locale prefix only when remaining path is a known page', () => {
    expect(getInvalidLocaleRedirectPath('/fr/download')).toBe('/download');
    expect(getInvalidLocaleRedirectPath('/fr/pricing')).toBe('/pricing');
    expect(getInvalidLocaleRedirectPath('/fr/compare/notion')).toBe('/compare/notion');
  });

  it('returns null for deep paths with invalid locale prefix when remaining path is unknown', () => {
    expect(getInvalidLocaleRedirectPath('/fr/unknown-page')).toBeNull();
  });

  it('returns null for single-segment paths (let 404 handle them)', () => {
    expect(getInvalidLocaleRedirectPath('/fr')).toBeNull();
    expect(getInvalidLocaleRedirectPath('/blog')).toBeNull();
  });
});
