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
import { generateBlogPageDefinitions } from './geo-article-defs';

export type LocaleState = 'published' | 'disabled';
export type PageKind = 'home' | 'product' | 'seo-landing' | 'compare' | 'legal' | 'blog';
export type SchemaMode = 'WebPage' | 'FAQPage' | 'SoftwareApplication' | 'none';

export interface SitePageDefinition {
  id: string;
  path: string;
  kind: PageKind;
  indexable: boolean;
  locales: Record<Locale, LocaleState>;
  schema: SchemaMode;
  lastModified: string;
  ogImage?: string;
}

export const SITE_BASE_URL = 'https://www.moryflow.com';

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
    lastModified: '2025-10-15',
  },
  {
    id: 'download',
    path: '/download',
    kind: 'product',
    indexable: true,
    locales: EN_ZH,
    schema: 'SoftwareApplication',
    lastModified: '2025-10-15',
  },
  {
    id: 'pricing',
    path: '/pricing',
    kind: 'product',
    indexable: true,
    locales: EN_ZH,
    schema: 'SoftwareApplication',
    lastModified: '2025-11-20',
  },
  {
    id: 'privacy',
    path: '/privacy',
    kind: 'legal',
    indexable: true,
    locales: EN_ZH,
    schema: 'WebPage',
    lastModified: '2025-10-15',
  },
  {
    id: 'terms',
    path: '/terms',
    kind: 'legal',
    indexable: true,
    locales: EN_ZH,
    schema: 'WebPage',
    lastModified: '2025-10-15',
  },
  {
    id: 'agent-workspace',
    path: '/agent-workspace',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2025-12-10',
  },
  {
    id: 'ai-note-taking-app',
    path: '/ai-note-taking-app',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2025-12-10',
  },
  {
    id: 'local-first-ai-notes',
    path: '/local-first-ai-notes',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2025-12-10',
  },
  {
    id: 'second-brain-app',
    path: '/second-brain-app',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-01-08',
  },
  {
    id: 'digital-garden-app',
    path: '/digital-garden-app',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-01-08',
  },
  {
    id: 'notes-to-website',
    path: '/notes-to-website',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-01-20',
  },
  {
    id: 'telegram-ai-agent',
    path: '/telegram-ai-agent',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-01-20',
  },
  {
    id: 'local-first-ai-agent',
    path: '/local-first-ai-agent',
    kind: 'seo-landing',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-01-20',
  },
  {
    id: 'compare',
    path: '/compare',
    kind: 'compare',
    indexable: true,
    locales: EN_ZH,
    schema: 'WebPage',
    lastModified: '2026-02-05',
  },
  {
    id: 'compare-notion',
    path: '/compare/notion',
    kind: 'compare',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-02-05',
  },
  {
    id: 'compare-obsidian',
    path: '/compare/obsidian',
    kind: 'compare',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-02-05',
  },
  {
    id: 'compare-manus',
    path: '/compare/manus',
    kind: 'compare',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-02-20',
  },
  {
    id: 'compare-cowork',
    path: '/compare/cowork',
    kind: 'compare',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-02-20',
  },
  {
    id: 'compare-openclaw',
    path: '/compare/openclaw',
    kind: 'compare',
    indexable: true,
    locales: EN_ZH,
    schema: 'FAQPage',
    lastModified: '2026-02-20',
  },
  ...generateBlogPageDefinitions(),
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
  return `${SITE_BASE_URL}${localePath(page.path, locale)}`;
}

export function getPageHref(path: string, locale: Locale = DEFAULT_LOCALE): string {
  const page = getPageByPath(path);

  if (!page) {
    return localePath(path, locale);
  }

  const publishedLocale = isPageLocalePublished(page, locale) ? locale : DEFAULT_LOCALE;
  return localePath(page.path, publishedLocale);
}

export function getInvalidLocaleRedirectPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);

  // Only attempt recovery for deep paths (e.g., `/fr/pricing`).
  // Single-segment unknown paths (e.g., `/fr`) should 404, not silently redirect to `/`.
  if (segments.length <= 1) return null;

  // Strip the first segment (presumed invalid locale) and check if the rest maps to a known page.
  const strippedPath = `/${segments.slice(1).join('/')}`;
  const page = getPageByPath(strippedPath);

  // Only redirect if the remaining path is a registered page — avoids guessing.
  return page ? getPageHref(page.path, DEFAULT_LOCALE) : null;
}

/**
 * Compute the target URL when switching to a different locale.
 * Returns { href, available } where `available: false` means the page
 * isn't published in the target locale (falls back to target-locale home).
 */
export function getLocaleSwitchHref(
  pathname: string,
  targetLocale: Locale
): { href: string; available: boolean } {
  const { path } = parseLocalePath(pathname);
  const page = getPageByPath(path);

  if (page) {
    if (page.locales[targetLocale] === 'published') {
      return { href: localePath(page.path, targetLocale), available: true };
    }
    return { href: localePath('/', targetLocale), available: false };
  }

  // Page not in registry — direct prefix swap, assume available
  return { href: localePath(path, targetLocale), available: true };
}

export function getLocaleRedirectPath(pathname: string, locale: Locale): string | null {
  const { path } = parseLocalePath(pathname);
  const page = getPageByPath(path);

  if (!page || isPageLocalePublished(page, locale)) {
    return null;
  }

  return getPageHref(page.path, DEFAULT_LOCALE);
}
