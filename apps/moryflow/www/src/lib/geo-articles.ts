/**
 * [PROVIDES]: GEO article types, glob-based content loader, page definition generator
 * [DEPENDS]: src/content/geo/* /*.md (glob import)
 * [POS]: Blog/GEO article infrastructure — auto-discovers .md content, builds registry
 */

import type { ComponentType } from 'react';
import type { Locale } from './i18n';
import type { SitePageDefinition, LocaleState } from './site-pages';

export interface GeoFrontmatter {
  publishedAt: string;
  title: string;
  description: string;
  headline: string;
  subheadline: string;
  keyTakeaways: string[];
  faqs: Array<{ question: string; answer: string }>;
  ctaTitle: string;
  ctaDescription: string;
  relatedPages: Array<{ label: string; href: string }>;
}

export interface GeoArticleLocaleData {
  frontmatter: GeoFrontmatter;
  Component: ComponentType;
}

export interface GeoArticle {
  slug: string;
  content: Record<Locale, GeoArticleLocaleData>;
}

// ─── Glob-based content discovery ───

interface MdModule {
  default: ComponentType;
  frontmatter: GeoFrontmatter;
}

const modules = import.meta.glob<MdModule>('../content/geo/*/*.md', {
  eager: true,
});

const articleMap = new Map<string, GeoArticle>();

for (const [path, mod] of Object.entries(modules)) {
  const match = path.match(/\/([^/]+)\/(en|zh)\.md$/);
  if (!match) continue;
  const slug = match[1]!;
  const locale = match[2] as Locale;

  if (!articleMap.has(slug)) {
    articleMap.set(slug, {
      slug,
      content: {} as Record<Locale, GeoArticleLocaleData>,
    });
  }

  articleMap.get(slug)!.content[locale] = {
    frontmatter: mod.frontmatter,
    Component: mod.default,
  };
}

const allArticles = Array.from(articleMap.values());

// ─── Public API ───

export function getArticleBySlug(slug: string): GeoArticle | undefined {
  return articleMap.get(slug);
}

export function getAllArticles(): GeoArticle[] {
  return allArticles;
}

// ─── Site pages integration ───

const BOTH_PUBLISHED = { en: 'published', zh: 'published' } as const satisfies Record<
  string,
  LocaleState
>;

export function generateBlogPageDefinitions(): SitePageDefinition[] {
  const latestDate =
    allArticles[0]?.content.en?.frontmatter.publishedAt ?? new Date().toISOString().slice(0, 10);

  const blogIndex: SitePageDefinition = {
    id: 'blog',
    path: '/blog',
    kind: 'blog',
    indexable: true,
    locales: BOTH_PUBLISHED,
    schema: 'WebPage',
    changefreq: 'weekly',
    priority: '0.7',
    lastModified: latestDate,
  };

  const articlePages = allArticles.map<SitePageDefinition>((article) => ({
    id: `blog-${article.slug}`,
    path: `/blog/${article.slug}`,
    kind: 'blog',
    indexable: true,
    locales: BOTH_PUBLISHED,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: article.content.en?.frontmatter.publishedAt ?? latestDate,
  }));

  return [blogIndex, ...articlePages];
}
