import { createContext, useContext } from 'react';
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { getPublicEnv, type PublicEnv } from '@/lib/env';
import '../styles/globals.css';

// Context for public environment variables
const EnvContext = createContext<PublicEnv | null>(null);

export function usePublicEnv(): PublicEnv {
  const env = useContext(EnvContext);
  if (!env) {
    throw new Error('usePublicEnv must be used within RootComponent');
  }
  return env;
}

export const Route = createRootRoute({
  loader: () => {
    const env = getPublicEnv();
    return { env };
  },
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Aiget Dev - APIs for AI Agents' },
      {
        name: 'description',
        content:
          'Aiget Dev provides unified APIs for AI agents: Fetchx (web data) and Memox (long-term memory).',
      },
      // Open Graph
      { property: 'og:title', content: 'Aiget Dev - APIs for AI agents' },
      {
        property: 'og:description',
        content: 'Fetchx (web data) and Memox (long-term memory) under one platform.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://aiget.dev' },
      { property: 'og:site_name', content: 'Aiget Dev' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Aiget Dev - APIs for AI agents' },
      {
        name: 'twitter:description',
        content: 'Fetchx (web data) and Memox (long-term memory) under one platform.',
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
          name: 'Aiget Dev',
          applicationCategory: 'DeveloperApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description: 'Unified APIs for AI agents: Fetchx (web data) and Memox (long-term memory)',
          url: 'https://aiget.dev',
        }),
      },
    ],
  }),
});

function RootComponent() {
  const { env } = Route.useLoaderData();

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
  );
}
