/**
 * Developer Page
 *
 * [INPUT]: None
 * [OUTPUT]: Developer resources and API documentation links
 * [POS]: /developer - Developer portal entry
 */

import { createFileRoute, Link } from '@tanstack/react-router';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import { ChevronLeft, Server, Book, Key, Code } from 'lucide-react';
import { Header, Footer } from '@/components/layout';

export const Route = createFileRoute('/developer')({
  component: DeveloperPage,
  head: () => ({
    meta: [
      { title: 'Developer - Anyhunt Dev' },
      {
        name: 'description',
        content:
          'Anyhunt Dev API documentation and developer resources. Build with Fetchx and Memox APIs.',
      },
    ],
  }),
});

const RESOURCES = [
  {
    title: 'API Documentation',
    description: 'Complete API reference for Fetchx, Memox, and Digest APIs',
    icon: Book,
    href: 'https://docs.anyhunt.app',
    external: true,
  },
  {
    title: 'API Keys',
    description: 'Manage your API keys and access tokens',
    icon: Key,
    href: 'https://console.anyhunt.app',
    external: true,
  },
  {
    title: 'Fetchx API',
    description: 'Web scraping, crawling, and data extraction API',
    icon: Server,
    href: '/fetchx',
    external: false,
  },
  {
    title: 'Memox API',
    description: 'Long-term memory and knowledge graph API for AI',
    icon: Code,
    href: '/memox',
    external: false,
  },
];

function DeveloperPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12">
          {/* Back link */}
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Back to Digest
          </Link>

          <h1 className="mb-2 text-3xl font-bold">Developer Resources</h1>
          <p className="mb-8 text-lg text-muted-foreground">
            Build powerful applications with Anyhunt Dev APIs
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {RESOURCES.map((resource) => {
              const IconComponent = resource.icon;
              return (
                <Card key={resource.title} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <IconComponent className="size-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      {resource.external ? (
                        <a href={resource.href} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      ) : (
                        <Link to={resource.href}>
                          {resource.title === 'Fetchx API' ? 'Learn More' : 'Learn More'}
                        </Link>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick start section */}
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-semibold">Quick Start</h2>
            <Card>
              <CardContent className="p-6">
                <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                  <code>{`# Install the SDK
npm install /sdk

# Use the API
import { Fetchx } from '@anyhunt/sdk';

const client = new Fetchx({ apiKey: 'ah_...' });
const result = await client.scrape({
  url: 'https://example.com',
  formats: ['markdown']
});`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
