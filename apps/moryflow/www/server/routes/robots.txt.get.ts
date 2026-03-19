import { defineEventHandler } from 'nitro/h3';

const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: https://moryflow.com/sitemap.xml

# Disallowed paths
Disallow: /api/v1/
Disallow: /_server/
`;

export default defineEventHandler(() => {
  return new Response(ROBOTS_TXT, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
});
