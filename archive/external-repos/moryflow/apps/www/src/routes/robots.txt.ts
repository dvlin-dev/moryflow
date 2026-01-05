/**
 * [PROVIDES]: Dynamic robots.txt generation
 * [DEPENDS]: None
 * [POS]: Core SEO route for guiding search engine crawlers
 */

import { createServerFileRoute } from '@tanstack/react-start/server'

export const ServerRoute = createServerFileRoute('/robots.txt')({
  methods: ['GET'],
  handler: async () => {
    const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://moryflow.com/sitemap.xml

# Disallowed paths
Disallow: /api/
Disallow: /_server/
`
    return new Response(robotsTxt, {
      headers: { 'Content-Type': 'text/plain' },
    })
  },
})
