/**
 * [PROVIDES]: GEO article types, glob-based content loader, article lookup
 * [DEPENDS]: src/content/geo/ (glob import, .md files)
 * [POS]: Blog content registry — only imported by blog route files, NOT by site-pages
 */

import type { ComponentType } from 'react';
import type { Locale } from './i18n';

export interface GeoFrontmatter {
  publishedAt: string;
  updatedAt?: string;
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
