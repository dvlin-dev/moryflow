/**
 * [PROVIDES]: 官网页面注册表与 locale 发布状态
 * [DEPENDS]: src/lib/i18n.ts
 * [POS]: 官网可索引页面的单一事实源
 */

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  localePath,
  parseLocalePath,
  type Locale,
} from './i18n';

export type LocaleState = 'published' | 'disabled';
export type PageKind = 'home' | 'product' | 'seo-landing' | 'compare' | 'legal';
export type SchemaMode = 'WebPage' | 'FAQPage' | 'SoftwareApplication' | 'none';

export interface SitePageDefinition {
  id: string;
  path: string;
  kind: PageKind;
  indexable: boolean;
  locales: Record<Locale, LocaleState>;
  schema: SchemaMode;
  changefreq: 'weekly' | 'monthly' | 'yearly';
  priority: '1.0' | '0.9' | '0.8' | '0.7' | '0.5' | '0.3';
  lastModified: string;
  ogImage?: string;
}

export const SITE_BASE_URL = 'https://www.moryflow.com';
const BUILD_DATE = '2026-03-08';

const EN_ONLY: Record<Locale, LocaleState> = {
  en: 'published',
  zh: 'disabled',
};

const EN_ZH: Record<Locale, LocaleState> = {
  en: 'published',
  zh: 'published',
};

export const sitePages: SitePageDefinition[] = [
  {
    id: 'home',
    path: '/',
    kind: 'home',
    indexable: true,
    locales: EN_ZH,
    schema: 'SoftwareApplication',
    changefreq: 'weekly',
    priority: '1.0',
    lastModified: BUILD_DATE,
  },
  {
    id: 'features',
    path: '/features',
    kind: 'product',
    indexable: true,
    locales: EN_ZH,
    schema: 'WebPage',
    changefreq: 'monthly',
    priority: '0.8',
    lastModified: BUILD_DATE,
  },
  {
    id: 'use-cases',
    path: '/use-cases',
    kind: 'product',
    indexable: true,
    locales: EN_ZH,
    schema: 'WebPage',
    changefreq: 'monthly',
    priority: '0.8',
    lastModified: BUILD_DATE,
  },
  {
    id: 'download',
    path: '/download',
    kind: 'product',
    indexable: true,
    locales: EN_ZH,
    schema: 'SoftwareApplication',
    changefreq: 'weekly',
    priority: '0.9',
    lastModified: BUILD_DATE,
  },
  {
    id: 'pricing',
    path: '/pricing',
    kind: 'product',
    indexable: true,
    locales: EN_ZH,
    schema: 'WebPage',
    changefreq: 'monthly',
    priority: '0.5',
    lastModified: BUILD_DATE,
  },
  {
    id: 'about',
    path: '/about',
    kind: 'product',
    indexable: true,
    locales: EN_ONLY,
    schema: 'WebPage',
    changefreq: 'monthly',
    priority: '0.5',
    lastModified: BUILD_DATE,
  },
  {
    id: 'privacy',
    path: '/privacy',
    kind: 'legal',
    indexable: true,
    locales: EN_ONLY,
    schema: 'WebPage',
    changefreq: 'yearly',
    priority: '0.3',
    lastModified: BUILD_DATE,
  },
  {
    id: 'terms',
    path: '/terms',
    kind: 'legal',
    indexable: true,
    locales: EN_ONLY,
    schema: 'WebPage',
    changefreq: 'yearly',
    priority: '0.3',
    lastModified: BUILD_DATE,
  },
  {
    id: 'agent-workspace',
    path: '/agent-workspace',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.8',
    lastModified: BUILD_DATE,
  },
  {
    id: 'ai-note-taking-app',
    path: '/ai-note-taking-app',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.8',
    lastModified: BUILD_DATE,
  },
  {
    id: 'local-first-ai-notes',
    path: '/local-first-ai-notes',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.8',
    lastModified: BUILD_DATE,
  },
  {
    id: 'second-brain-app',
    path: '/second-brain-app',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.8',
    lastModified: BUILD_DATE,
  },
  {
    id: 'digital-garden-app',
    path: '/digital-garden-app',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.8',
    lastModified: BUILD_DATE,
  },
  {
    id: 'notes-to-website',
    path: '/notes-to-website',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  },
  {
    id: 'telegram-ai-agent',
    path: '/telegram-ai-agent',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  },
  {
    id: 'local-first-ai-agent',
    path: '/local-first-ai-agent',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  },
  {
    id: 'compare-notion',
    path: '/compare/notion',
    kind: 'compare',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  },
  {
    id: 'compare-obsidian',
    path: '/compare/obsidian',
    kind: 'compare',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  },
  {
    id: 'compare-manus',
    path: '/compare/manus',
    kind: 'compare',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  },
  {
    id: 'compare-cowork',
    path: '/compare/cowork',
    kind: 'compare',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  },
  {
    id: 'compare-openclaw',
    path: '/compare/openclaw',
    kind: 'compare',
    indexable: true,
    locales: EN_ONLY,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  },
];

export function getPageById(id: string): SitePageDefinition | undefined {
  return sitePages.find((page) => page.id === id);
}

export function getPageByPath(path: string): SitePageDefinition | undefined {
  return sitePages.find((page) => page.path === path);
}

export function getPublishedLocales(page: SitePageDefinition): Locale[] {
  return SUPPORTED_LOCALES.filter((locale) => page.locales[locale] === 'published');
}

export function isPageLocalePublished(page: SitePageDefinition, locale: Locale): boolean {
  return page.locales[locale] === 'published';
}

export function getIndexablePages(): SitePageDefinition[] {
  return sitePages.filter((page) => page.indexable);
}

export function getPageCanonicalUrl(
  page: SitePageDefinition,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (locale === DEFAULT_LOCALE) {
    return `${SITE_BASE_URL}${page.path}`;
  }
  return `${SITE_BASE_URL}/${locale}${page.path === '/' ? '' : page.path}`;
}

export function getPageHref(path: string, locale: Locale = DEFAULT_LOCALE): string {
  const page = getPageByPath(path);

  if (!page) {
    return localePath(path, locale);
  }

  const publishedLocale = isPageLocalePublished(page, locale) ? locale : DEFAULT_LOCALE;
  return localePath(page.path, publishedLocale);
}

export function getInvalidLocaleRedirectPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const strippedPath = segments.length <= 1 ? '/' : `/${segments.slice(1).join('/')}`;
  return getPageHref(strippedPath, DEFAULT_LOCALE);
}

export function getLocaleRedirectPath(pathname: string, locale: Locale): string | null {
  const { path } = parseLocalePath(pathname);
  const page = getPageByPath(path);

  if (!page || isPageLocalePublished(page, locale)) {
    return null;
  }

  return getPageHref(page.path, DEFAULT_LOCALE);
}
