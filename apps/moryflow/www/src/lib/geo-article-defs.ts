/**
 * [PROVIDES]: Lightweight blog page definitions for sitemap/routing
 * [DEPENDS]: src/lib/site-pages.ts
 * [POS]: Derives blog page metadata from article frontmatter without loading MDX components
 */

import type { SitePageDefinition, LocaleState } from './site-pages';

// Only import the `frontmatter` named export — avoids pulling MDX components into the module graph.
// This keeps site-pages.ts (imported by Header/Footer/landing pages) free of blog content.
const frontmatters = import.meta.glob<{ publishedAt: string; updatedAt?: string }>(
  '../content/geo/*/en.md',
  { eager: true, import: 'frontmatter' }
);

const BOTH_PUBLISHED = { en: 'published', zh: 'published' } as const satisfies Record<
  string,
  LocaleState
>;

export function generateBlogPageDefinitions(): SitePageDefinition[] {
  const entries = Object.entries(frontmatters)
    .map(([path, fm]) => {
      const slug = path.match(/\/([^/]+)\/en\.md$/)?.[1];
      return slug ? { slug, lastModified: fm.updatedAt ?? fm.publishedAt } : null;
    })
    .filter((e): e is { slug: string; lastModified: string } => !!e);

  const articlePages = entries.map<SitePageDefinition>(({ slug, lastModified }) => ({
    id: `blog-${slug}`,
    path: `/blog/${slug}`,
    kind: 'blog',
    indexable: true,
    locales: BOTH_PUBLISHED,
    schema: 'FAQPage',
    lastModified,
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
