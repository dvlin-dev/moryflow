/**
 * [PROVIDES]: Lightweight blog page definitions for sitemap/routing
 * [DEPENDS]: src/lib/site-pages.ts, src/lib/geo-articles.ts
 * [POS]: Derives blog page metadata from article frontmatter for sitemap/SEO registry
 */

import type { SitePageDefinition, LocaleState } from './site-pages';
import { getAllArticles } from './geo-articles';

const BOTH_PUBLISHED = { en: 'published', zh: 'published' } as const satisfies Record<
  string,
  LocaleState
>;

export function generateBlogPageDefinitions(): SitePageDefinition[] {
  const articles = getAllArticles();

  const articlePages = articles.map<SitePageDefinition>((article) => ({
    id: `blog-${article.slug}`,
    path: `/blog/${article.slug}`,
    kind: 'blog',
    indexable: true,
    locales: BOTH_PUBLISHED,
    schema: 'FAQPage',
    lastModified: article.content.en.frontmatter.publishedAt,
  }));

  const latestDate = articlePages.reduce(
    (max, p) => (p.lastModified > max ? p.lastModified : max),
    ''
  );

  const blogIndex: SitePageDefinition = {
    id: 'blog',
    path: '/blog',
    kind: 'blog',
    indexable: true,
    locales: BOTH_PUBLISHED,
    schema: 'WebPage',
    lastModified: latestDate,
  };

  return [blogIndex, ...articlePages];
}
