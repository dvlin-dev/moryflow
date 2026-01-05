import { createContext, useContext } from 'react'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { getPublicEnv, type PublicEnv } from '@/lib/env'
import '../styles/globals.css'

// Context for public environment variables
const EnvContext = createContext<PublicEnv | null>(null)

export function usePublicEnv(): PublicEnv {
  const env = useContext(EnvContext)
  if (!env) {
    throw new Error('usePublicEnv must be used within RootComponent')
  }
  return env
}

export const Route = createRootRoute({
  loader: () => {
    const env = getPublicEnv()
    return { env }
  },
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'AIGet - Web Scraping API for AI Agents' },
      {
        name: 'description',
        content:
          'Crawl, extract, and transform web data with a powerful API. Built for LLMs, RAG pipelines, and AI applications.',
      },
      // Open Graph
      { property: 'og:title', content: 'AIGet - Web Scraping API for AI' },
      {
        property: 'og:description',
        content:
          'Crawl, extract, and transform web data with a powerful API. Built for LLMs, RAG pipelines, and AI applications.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://aiget.dev' },
      { property: 'og:site_name', content: 'AIGet' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'AIGet - Web Scraping API for AI' },
      {
        name: 'twitter:description',
        content:
          'Crawl, extract, and transform web data with a powerful API. Built for AI applications.',
      },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico' },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap',
      },
      { rel: 'canonical', href: 'https://aiget.dev' },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'AIGet',
          applicationCategory: 'DeveloperApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description:
            'Web Scraping API for AI Agents - Crawl, extract, and transform web data',
          url: 'https://aiget.dev',
        }),
      },
    ],
  }),
})

function RootComponent() {
  const { env } = Route.useLoaderData()

  return (
    <EnvContext.Provider value={env}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body className="flex min-h-screen flex-col">
          <Outlet />
          <Scripts />
        </body>
      </html>
    </EnvContext.Provider>
  )
}
