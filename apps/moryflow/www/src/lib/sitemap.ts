/**
 * [PROVIDES]: Sitemap XML generation from page registry
 * [DEPENDS]: site-pages.ts, i18n.ts
 * [POS]: SEO infrastructure
 */

import { getIndexablePages, getPageCanonicalUrl, getPublishedLocales } from './site-pages';
import { DEFAULT_LOCALE, LOCALE_HREFLANG } from './i18n';

export function generateSitemapXml(): string {
  const pages = getIndexablePages();

  const urls = pages.flatMap((page) => {
    const locales = getPublishedLocales(page);
    return locales.map((locale) => {
      const loc = getPageCanonicalUrl(page, locale);

      // Build xhtml:link alternates for all locales this page supports
      const alternates = locales
        .map((altLocale) => {
          const altHref = getPageCanonicalUrl(page, altLocale);
          const hreflang = LOCALE_HREFLANG[altLocale] ?? altLocale;
          return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${altHref}" />`;
        })
        .join('\n');

      // x-default points to English version
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
