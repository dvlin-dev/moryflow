import { createFileRoute } from '@tanstack/react-router';

const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: https://moryflow.com/sitemap.xml

# Disallowed paths
Disallow: /api/v1/
Disallow: /_server/
`;

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(ROBOTS_TXT, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        }),
    },
  },
});
