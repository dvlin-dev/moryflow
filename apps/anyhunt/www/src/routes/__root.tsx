import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getPublicEnv, type PublicEnv } from '@/lib/env';
import { PublicEnvProvider } from '@/lib/public-env-context';
import { AuthModalProvider } from '@/components/auth/auth-modal';
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { authMethods } from '@/lib/auth/auth-methods';

function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        retry: 1,
      },
    },
  });
}

export const Route = createRootRoute({
  loader: () => {
    const env = getPublicEnv();
    return { env };
  },
  component: RootComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFoundComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Anyhunt Dev - APIs for AI Agents' },
      {
        name: 'description',
        content:
          'Anyhunt Dev provides unified APIs for AI agents: Fetchx (web data) and Memox (long-term memory).',
      },
      // Open Graph
      { property: 'og:title', content: 'Anyhunt Dev - APIs for AI agents' },
      {
        property: 'og:description',
        content: 'Fetchx (web data) and Memox (long-term memory) under one platform.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://anyhunt.app' },
      { property: 'og:site_name', content: 'Anyhunt Dev' },
      // Twitter Card
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Anyhunt Dev - APIs for AI agents' },
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
      { rel: 'canonical', href: 'https://anyhunt.app' },
    ],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Anyhunt Dev',
          applicationCategory: 'DeveloperApplication',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description: 'Unified APIs for AI agents: Fetchx (web data) and Memox (long-term memory)',
          url: 'https://anyhunt.app',
        }),
      },
    ],
  }),
});

function RootComponent() {
  const { env } = Route.useLoaderData();
  const [queryClient] = useState(() => createAppQueryClient());

  useEffect(() => {
    void authMethods.bootstrapAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PublicEnvProvider env={env}>
        <AuthModalProvider>
          <html lang="en" suppressHydrationWarning>
            <head>
              <HeadContent />
            </head>
            <body className="flex min-h-screen flex-col">
              <Outlet />
              <Scripts />
            </body>
          </html>
        </AuthModalProvider>
      </PublicEnvProvider>
    </QueryClientProvider>
  );
}

function RootErrorComponent({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Unexpected error';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please refresh the page. If the issue persists, contact support.
          </p>
          <div className="mt-6 flex gap-2">
            <a
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm text-primary-foreground"
            >
              Back to Digest
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm"
            >
              Reload
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 overflow-auto rounded-md border border-border bg-muted p-3 text-xs">
              {message}
            </pre>
          )}
        </main>
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundComponent() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <a
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm text-primary-foreground"
        >
          Back to Home
        </a>
      </div>
    </main>
  );
}
