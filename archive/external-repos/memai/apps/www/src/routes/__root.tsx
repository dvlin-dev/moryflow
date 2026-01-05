import { createContext, useContext } from 'react'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { getPublicEnv, type PublicEnv } from '@/lib/env'
import '@/styles/globals.css'

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
      { title: 'memai - Semantic Memory API for AI Agents' },
      {
        name: 'description',
        content:
          'Give your AI agents long-term memory. Semantic search, knowledge graphs, and entity extraction API.',
      },
      { property: 'og:title', content: 'memai - Semantic Memory API for AI' },
      {
        property: 'og:description',
        content:
          'Give your AI agents long-term memory. Semantic search, knowledge graphs, and entity extraction API.',
      },
      { property: 'og:image', content: 'https://memai.dev/og-image.png' },
      { property: 'og:url', content: 'https://memai.dev' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'memai',
          applicationCategory: 'DeveloperApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description: 'Semantic Memory API for AI Agents',
          url: 'https://memai.dev',
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
