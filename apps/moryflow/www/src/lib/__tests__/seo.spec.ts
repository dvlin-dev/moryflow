import { describe, it, expect } from 'vitest';
import { generateMeta, generateHreflangLinks, siteConfig } from '../seo';
import { getLocaleRedirectPath, getPageById, getPageByPath, getPageHref } from '../site-pages';
import { localePath } from '../i18n';

describe('seo', () => {
  it('uses www host for canonical URLs', () => {
    expect(siteConfig.url).toBe('https://www.moryflow.com');
  });

  it('uses available Open Graph image', () => {
    expect(siteConfig.ogImage).toBe('https://www.moryflow.com/og-image.svg');
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
    expect(ogUrl).toBe('https://www.moryflow.com/zh/download');
  });

  it('uses locale-specific og:locale', () => {
    const meta = generateMeta({
      locale: 'zh',
      title: 'Features',
      path: '/features',
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
        href: 'https://www.moryflow.com/privacy',
      },
      {
        rel: 'alternate',
        hreflang: 'x-default',
        href: 'https://www.moryflow.com/privacy',
      },
    ]);
  });
});

describe('site pages registry', () => {
  it('publishes only the 5 frozen product pages in zh', () => {
    expect(getPageById('home')?.locales.zh).toBe('published');
    expect(getPageById('features')?.locales.zh).toBe('published');
    expect(getPageById('download')?.locales.zh).toBe('published');
    expect(getPageById('pricing')?.locales.zh).toBe('published');
    expect(getPageById('use-cases')?.locales.zh).toBe('published');

    expect(getPageById('about')?.locales.zh).toBe('disabled');
    expect(getPageById('agent-workspace')?.locales.zh).toBe('disabled');
    expect(getPageById('compare-openclaw')?.locales.zh).toBe('disabled');
    expect(getPageById('privacy')?.locales.zh).toBe('disabled');
  });

  it('finds pages by canonical path', () => {
    expect(getPageByPath('/features')?.id).toBe('features');
    expect(getPageByPath('/compare/openclaw')?.id).toBe('compare-openclaw');
  });

  it('generates locale-prefixed paths consistently', () => {
    expect(localePath('/download', 'en')).toBe('/download');
    expect(localePath('/download', 'zh')).toBe('/zh/download');
    expect(localePath('/', 'zh')).toBe('/zh');
  });

  it('keeps bilingual links in zh and falls back to English for en-only pages', () => {
    expect(getPageHref('/features', 'zh')).toBe('/zh/features');
    expect(getPageHref('/compare/notion', 'zh')).toBe('/compare/notion');
    expect(getPageHref('/privacy', 'zh')).toBe('/privacy');
  });

  it('computes redirect targets for unpublished locale pages', () => {
    expect(getLocaleRedirectPath('/zh/privacy', 'zh')).toBe('/privacy');
    expect(getLocaleRedirectPath('/zh/agent-workspace', 'zh')).toBe('/agent-workspace');
    expect(getLocaleRedirectPath('/zh/features', 'zh')).toBeNull();
  });
});
