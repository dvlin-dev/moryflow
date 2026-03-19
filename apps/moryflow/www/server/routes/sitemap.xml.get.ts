import { defineEventHandler } from 'nitro/h3';
import { generateSitemapXml } from '../../src/lib/sitemap';

export default defineEventHandler(() => {
  return new Response(generateSitemapXml(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
});
