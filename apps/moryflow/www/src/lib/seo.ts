/**
 * [PROVIDES]: SEO 配置、元数据生成、hreflang 链接生成
 * [DEPENDS]: src/lib/i18n.ts, src/lib/site-pages.ts
 * [POS]: 官网全局 SEO 工具
 */

import { DEFAULT_LOCALE, LOCALE_HREFLANG, localePath, resolveLocale, type Locale } from './i18n';
import { getPageById, getPageByPath, getPageCanonicalUrl, getPublishedLocales } from './site-pages';

export const siteConfig = {
  name: 'Moryflow',
  title: 'Moryflow - Local-first AI Agent Workspace',
  description:
    'AI agents that work with your knowledge, notes, and files. Capture outputs as durable knowledge and publish to the web. Public desktop app for macOS.',
  url: 'https://www.moryflow.com',
  ogImage: 'https://www.moryflow.com/og-image.svg',
  twitter: '@moryflow',
};

const OG_LOCALE_MAP: Record<Locale, string> = {
  en: 'en_US',
  zh: 'zh_Hans_CN',
};

interface PageMeta {
  locale: Locale;
  title?: string;
  description?: string;
  image?: string;
  path: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}

export function generateMeta(page: PageMeta) {
  const title = page.title ? `${page.title} | ${siteConfig.name}` : siteConfig.title;
  const description = page.description || siteConfig.description;
  const url = `${siteConfig.url}${localePath(page.path, page.locale)}`;
  const image = page.image || siteConfig.ogImage;

  const meta = [
    // 基础 SEO
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'index, follow' },
    { name: 'author', content: 'Moryflow Team' },

    // Open Graph
    { property: 'og:type', content: page.type || 'website' },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:locale', content: OG_LOCALE_MAP[page.locale] },
    { property: 'og:site_name', content: siteConfig.name },

    // Twitter 卡片
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: siteConfig.twitter },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ];

  // 文章类型元数据
  if (page.type === 'article') {
    if (page.publishedTime) {
      meta.push({ property: 'article:published_time', content: page.publishedTime });
    }
    if (page.modifiedTime) {
      meta.push({ property: 'article:modified_time', content: page.modifiedTime });
    }
  }

  return meta;
}

export function getCanonicalUrl(path: string, locale: Locale): string {
  const page = getPageByPath(path);
  return page ? getPageCanonicalUrl(page, locale) : `${siteConfig.url}${localePath(path, locale)}`;
}

/**
 * Generate hreflang link tags for a page.
 * Returns alternate links for all published locales, plus x-default.
 */
export function generateHreflangLinks({
  path,
  locale: _currentLocale,
}: {
  path: string;
  locale: Locale;
}) {
  const page = getPageByPath(path);
  const locales = page ? getPublishedLocales(page) : [DEFAULT_LOCALE];
  const links: { rel: string; hreflang: string; href: string }[] = [];

  for (const locale of locales) {
    const hreflang = LOCALE_HREFLANG[locale];
    const href = getCanonicalUrl(path, locale);
    links.push({ rel: 'alternate', hreflang, href });
  }

  // x-default points to English version
  links.push({
    rel: 'alternate',
    hreflang: 'x-default',
    href: getCanonicalUrl(path, DEFAULT_LOCALE),
  });

  return links;
}

export function getPageMeta({
  pageId,
  locale: rawLocale,
  title,
  description,
  path,
  image,
  type,
  publishedTime,
  modifiedTime,
}: {
  pageId: string;
  locale?: string;
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
}) {
  const locale = resolveLocale(rawLocale);
  const page = getPageById(pageId);
  const canonicalPath = page?.path ?? path;

  if (!canonicalPath) {
    throw new Error(`Missing canonical path for page "${pageId}"`);
  }

  return {
    meta: generateMeta({
      locale,
      title,
      description,
      image,
      path: canonicalPath,
      type,
      publishedTime,
      modifiedTime,
    }),
    links: [
      { rel: 'canonical', href: getCanonicalUrl(canonicalPath, locale) },
      ...generateHreflangLinks({ path: canonicalPath, locale }),
    ],
  };
}
