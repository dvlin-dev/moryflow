/**
 * [PROVIDES]: Dynamic sitemap.xml generation
 * [DEPENDS]: None
 * [POS]: Core SEO route for search engine crawlers
 */

import { createServerFileRoute } from '@tanstack/react-start/server'

const pages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/features', priority: 0.9, changefreq: 'weekly' },
  { path: '/pricing', priority: 0.9, changefreq: 'weekly' },
  { path: '/download', priority: 0.8, changefreq: 'weekly' },
  { path: '/about', priority: 0.7, changefreq: 'monthly' },
  { path: '/privacy', priority: 0.5, changefreq: 'monthly' },
  { path: '/terms', priority: 0.5, changefreq: 'monthly' },
]

export const ServerRoute = createServerFileRoute('/sitemap.xml')({
  methods: ['GET'],
  handler: async () => {
    const baseUrl = 'https://moryflow.com'
    const lastmod = new Date().toISOString().split('T')[0]

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  },
})
