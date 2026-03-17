/**
 * [PROVIDES]: Lightweight blog page definitions for sitemap/routing (no content loading)
 * [DEPENDS]: src/lib/i18n.ts, src/lib/site-pages.ts
 * [POS]: Extracts article slugs from glob paths without importing .md content
 */

import type { SitePageDefinition, LocaleState } from './site-pages';

declare const __BUILD_DATE__: string;
const BUILD_DATE =
  typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : new Date().toISOString().slice(0, 10);

// Extract slugs from glob paths — does NOT load or parse any .md content.
// import.meta.glob without `eager` returns lazy loaders; we only read the keys.
const paths = import.meta.glob('../content/geo/*/en.md');
const slugs = Object.keys(paths)
  .map((p) => p.match(/\/([^/]+)\/en\.md$/)?.[1])
  .filter((s): s is string => !!s);

const BOTH_PUBLISHED = { en: 'published', zh: 'published' } as const satisfies Record<
  string,
  LocaleState
>;

export function generateBlogPageDefinitions(): SitePageDefinition[] {
  const blogIndex: SitePageDefinition = {
    id: 'blog',
    path: '/blog',
    kind: 'blog',
    indexable: true,
    locales: BOTH_PUBLISHED,
    schema: 'WebPage',
    changefreq: 'weekly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  };

  const articlePages = slugs.map<SitePageDefinition>((slug) => ({
    id: `blog-${slug}`,
    path: `/blog/${slug}`,
    kind: 'blog',
    indexable: true,
    locales: BOTH_PUBLISHED,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: BUILD_DATE,
  }));

  return [blogIndex, ...articlePages];
}
