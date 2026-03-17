/**
 * [PROVIDES]: GEO article types, registry, lookup, page definition generator
 * [DEPENDS]: src/content/geo/index.ts
 * [POS]: Blog/GEO article infrastructure — types, content lookup, sitemap integration
 */

import type { FaqItem } from '@/components/shared/FaqSection';
import type { Locale } from './i18n';
import type { SitePageDefinition, LocaleState } from './site-pages';
import { allGeoArticles } from '@/content/geo';

export interface GeoArticleSection {
  heading: string;
  paragraphs: string[];
  callout?: string;
}

export interface GeoArticleContent {
  title: string;
  description: string;
  headline: string;
  subheadline: string;
  keyTakeaways: string[];
  sections: GeoArticleSection[];
  faqs: FaqItem[];
  ctaTitle: string;
  ctaDescription: string;
  relatedPages: Array<{ label: string; href: string }>;
}

export interface GeoArticle {
  slug: string;
  publishedAt: string;
  content: Record<Locale, GeoArticleContent>;
}

const articleMap = new Map<string, GeoArticle>(allGeoArticles.map((a) => [a.slug, a]));

export function getArticleBySlug(slug: string): GeoArticle | undefined {
  return articleMap.get(slug);
}

export function getAllArticles(): GeoArticle[] {
  return allGeoArticles;
}

const BOTH_PUBLISHED = { en: 'published', zh: 'published' } as const satisfies Record<
  string,
  LocaleState
>;

export function generateBlogPageDefinitions(): SitePageDefinition[] {
  const latestDate = allGeoArticles[0]?.publishedAt ?? new Date().toISOString().slice(0, 10);

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

  const articlePages = allGeoArticles.map<SitePageDefinition>((article) => ({
    id: `blog-${article.slug}`,
    path: `/blog/${article.slug}`,
    kind: 'blog',
    indexable: true,
    locales: BOTH_PUBLISHED,
    schema: 'FAQPage',
    changefreq: 'monthly',
    priority: '0.7',
    lastModified: article.publishedAt,
  }));

  return [blogIndex, ...articlePages];
}
