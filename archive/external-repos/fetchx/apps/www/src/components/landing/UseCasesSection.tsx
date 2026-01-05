import { Container } from '@/components/layout'
import { Globe, Layers, Map, Sparkles, Search, Camera } from 'lucide-react'

const useCases = [
  {
    icon: Globe,
    title: 'Web Scraping',
    description:
      'Convert any webpage to clean Markdown or HTML. Perfect for building knowledge bases, training data, and content aggregation.',
  },
  {
    icon: Layers,
    title: 'Site Crawling',
    description:
      'Crawl entire websites with depth control and path filtering. Ideal for indexing documentation, blogs, and e-commerce catalogs.',
  },
  {
    icon: Map,
    title: 'URL Discovery',
    description:
      'Map all URLs on a website via sitemap parsing or link extraction. Great for SEO audits and competitive analysis.',
  },
  {
    icon: Sparkles,
    title: 'AI Extraction',
    description:
      'Extract structured data using LLMs with custom prompts and JSON schemas. Build product catalogs, contact lists, and more.',
  },
  {
    icon: Search,
    title: 'Web Search',
    description:
      'Search the web and optionally scrape results. Power your RAG pipelines with fresh, relevant content from across the internet.',
  },
  {
    icon: Camera,
    title: 'Screenshots',
    description:
      'Capture webpage screenshots in PNG, JPEG, or WebP. Support for full-page, viewport, and custom dimensions.',
  },
]

export function UseCasesSection() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
            USE CASES
          </h2>
          <p className="mt-4 text-muted-foreground">
            From web scraping to AI extraction, one API for all your data needs
          </p>
        </div>

        {/* Use Case Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="group border border-border bg-card p-6 transition-colors hover:border-foreground/20 hover:bg-muted/50"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center border border-border bg-background">
                <useCase.icon className="h-5 w-5" />
              </div>
              <h3 className="font-mono text-lg font-semibold">{useCase.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
