import { createFileRoute } from '@tanstack/react-router';
import { generateBlogSitemapXml } from '@/lib/sitemap';

export const Route = createFileRoute('/sitemap-blog.xml')({
  server: {
    handlers: {
      GET: async () =>
        new Response(generateBlogSitemapXml(), {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        }),
    },
  },
});
