import { createFileRoute } from '@tanstack/react-router';
import { generatePagesSitemapXml } from '@/lib/sitemap';

export const Route = createFileRoute('/sitemap-pages.xml')({
  server: {
    handlers: {
      GET: async () =>
        new Response(generatePagesSitemapXml(), {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        }),
    },
  },
});
