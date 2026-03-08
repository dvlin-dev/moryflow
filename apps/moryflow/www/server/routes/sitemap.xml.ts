/**
 * [PROVIDES]: 动态 sitemap.xml 输出（从页面注册表生成，含多语言 xhtml:link）
 * [DEPENDS]: src/lib/site-pages.ts
 * [POS]: 官网 SEO 路由（索引入口）
 */

import { defineEventHandler } from 'h3';
import {
  getIndexablePages,
  getPageCanonicalUrl,
  getPublishedLocales,
} from '../../src/lib/site-pages';
import { DEFAULT_LOCALE, LOCALE_HREFLANG } from '../../src/lib/i18n';

export default defineEventHandler(() => {
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
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${alternates}
${xDefault}
  </url>`;
    });
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' },
  });
});
