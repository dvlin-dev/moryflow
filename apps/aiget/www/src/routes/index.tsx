import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight01Icon, Database01Icon, Globe02Icon } from '@hugeicons/core-free-icons';
import { Header, Footer } from '@/components/layout';
import { Container } from '@/components/layout';
import { Button, Icon } from '@aiget/ui';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-background py-16 md:py-20 lg:py-24">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:24px_24px]" />
          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-mono text-4xl font-bold tracking-tight md:text-5xl">Aiget Dev</h1>
              <p className="mt-5 text-lg text-muted-foreground md:text-xl">
                One platform for AI agents: web data (Fetchx) and long-term memory (Memox).
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild className="font-mono">
                  <a href="https://console.aiget.dev" target="_blank" rel="noopener noreferrer">
                    Open Console <Icon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" className="font-mono">
                  <a
                    href="https://server.aiget.dev/api-docs"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    API Docs
                  </a>
                </Button>
              </div>
            </div>
          </Container>
        </section>

        <section className="border-b border-border py-16 md:py-20">
          <Container>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border border-border bg-card p-6">
                <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                  <Icon icon={Globe02Icon} className="h-4 w-4" />
                  <span>Fetchx</span>
                </div>
                <h2 className="mt-4 font-mono text-2xl font-bold">Web data for AI</h2>
                <p className="mt-3 text-muted-foreground">
                  Scrape, crawl, and extract structured data from websites.
                </p>
                <div className="mt-6">
                  <Button asChild variant="outline" className="font-mono">
                    <a href="/fetchx">
                      Explore Fetchx <Icon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="border border-border bg-card p-6">
                <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                  <Icon icon={Database01Icon} className="h-4 w-4" />
                  <span>Memox</span>
                </div>
                <h2 className="mt-4 font-mono text-2xl font-bold">Long-term memory</h2>
                <p className="mt-3 text-muted-foreground">
                  Store and query semantic memories, entities, and knowledge graphs.
                </p>
                <div className="mt-6">
                  <Button asChild variant="outline" className="font-mono">
                    <a href="/memox">
                      Explore Memox <Icon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
