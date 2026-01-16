import { Globe02Icon } from '@hugeicons/core-free-icons';
import { Container } from '@/components/layout';
import { HeroPlayground } from '@/components/playground/HeroPlayground';
import { Icon } from '@anyhunt/ui';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Grid background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <Container className="relative">
        <div className="flex flex-col items-center py-16 text-center md:py-20 lg:py-24">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 border border-border bg-muted/50 px-3 py-1 font-mono text-xs">
            <Icon icon={Globe02Icon} className="h-3 w-3" />
            <span>Any topic. AI hunts</span>
          </div>

          {/* Headline */}
          <h1 className="max-w-4xl font-mono text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Web Scraping API for
            <br />
            <span className="text-orange-500">AI Agents</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Always-on updates from across the web. Crawl, extract, and transform web data with a powerful API.
            Built for LLMs, RAG pipelines, and AI applications.
          </p>

          {/* Playground */}
          <div className="mt-10 w-full">
            <HeroPlayground />
          </div>

          {/* Trust indicators */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-green-500" />
              <span className="font-mono">Markdown Output</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-blue-500" />
              <span className="font-mono">AI Extraction</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-orange-500" />
              <span className="font-mono">Site Crawling</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-purple-500" />
              <span className="font-mono">Smart Caching</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
