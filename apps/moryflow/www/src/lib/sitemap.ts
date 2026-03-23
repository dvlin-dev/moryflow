/**
 * [PROVIDES]: Sitemap XML generation from page registry
 * [DEPENDS]: site-pages.ts, i18n.ts
 * [POS]: SEO infrastructure
 */

import {
  SITE_BASE_URL,
  getIndexablePages,
  getPageCanonicalUrl,
  getPublishedLocales,
  type SitePageDefinition,
} from './site-pages';
import { DEFAULT_LOCALE, LOCALE_HREFLANG } from './i18n';

type SitemapSectionId = 'pages' | 'blog';

const SITEMAP_SECTION_PATHS: Record<SitemapSectionId, string> = {
  pages: '/sitemap-pages.xml',
  blog: '/sitemap-blog.xml',
};

function renderUrlSetXml(pages: SitePageDefinition[]): string {
  const urls = pages.flatMap((page) => {
    const locales = getPublishedLocales(page);

    return locales.map((locale) => {
      const loc = getPageCanonicalUrl(page, locale);

      const alternates = locales
        .map((altLocale) => {
          const altHref = getPageCanonicalUrl(page, altLocale);
          const hreflang = LOCALE_HREFLANG[altLocale] ?? altLocale;
          return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${altHref}" />`;
        })
        .join('\n');

      const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${getPageCanonicalUrl(page, DEFAULT_LOCALE)}" />`;

      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${page.lastModified}</lastmod>
${alternates}
${xDefault}
  </url>`;
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
}

function getLatestLastModified(pages: SitePageDefinition[]): string {
  return pages.reduce(
    (latest, page) => (page.lastModified > latest ? page.lastModified : latest),
    ''
  );
}

function getPagesForSection(section: SitemapSectionId): SitePageDefinition[] {
  const pages = getIndexablePages();

  if (section === 'blog') {
    return pages.filter((page) => page.kind === 'blog');
  }

  return pages.filter((page) => page.kind !== 'blog');
}

function renderSitemapIndexEntry(section: SitemapSectionId): string {
  const pages = getPagesForSection(section);
  const lastModified = getLatestLastModified(pages);
  const loc = `${SITE_BASE_URL}${SITEMAP_SECTION_PATHS[section]}`;

  return `  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${lastModified}</lastmod>
  </sitemap>`;
}

export function generateSitemapIndexXml(): string {
  const sections: SitemapSectionId[] = ['pages', 'blog'];

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sections.map((section) => renderSitemapIndexEntry(section)).join('\n')}
</sitemapindex>`;
}

export function generatePagesSitemapXml(): string {
  return renderUrlSetXml(getPagesForSection('pages'));
}

export function generateBlogSitemapXml(): string {
  return renderUrlSetXml(getPagesForSection('blog'));
}
