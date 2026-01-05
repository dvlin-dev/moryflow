/**
 * [PROVIDES]: SEO configuration and metadata generation utilities
 * [DEPENDS]: None
 * [POS]: Core SEO utility for the website, used by all pages
 */

export const siteConfig = {
  name: 'Moryflow',
  title: 'Moryflow - Your AI Knowledge Assistant',
  description:
    'Not a chatbot, a thinking companion. Local-first, privacy-focused AI note-taking tool.',
  url: 'https://moryflow.com',
  ogImage: 'https://moryflow.com/og-image.png',
  twitter: '@moryflow',
  locale: 'en_US',
}

interface PageMeta {
  title?: string
  description?: string
  image?: string
  path?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
}

/**
 * Generate page SEO metadata
 */
export function generateMeta(page: PageMeta = {}) {
  const title = page.title
    ? `${page.title} | ${siteConfig.name}`
    : siteConfig.title
  const description = page.description || siteConfig.description
  const url = `${siteConfig.url}${page.path || ''}`
  const image = page.image || siteConfig.ogImage

  const meta = [
    // Basic SEO
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'index, follow' },
    { name: 'author', content: 'Moryflow Team' },

    // Open Graph
    { property: 'og:type', content: page.type || 'website' },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:locale', content: siteConfig.locale },
    { property: 'og:site_name', content: siteConfig.name },

    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: siteConfig.twitter },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image },
  ]

  // Article-specific metadata
  if (page.type === 'article') {
    if (page.publishedTime) {
      meta.push({ property: 'article:published_time', content: page.publishedTime })
    }
    if (page.modifiedTime) {
      meta.push({ property: 'article:modified_time', content: page.modifiedTime })
    }
  }

  return meta
}
