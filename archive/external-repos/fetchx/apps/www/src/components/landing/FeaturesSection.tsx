import { Container } from '@/components/layout'
import {
  FileText,
  BookOpen,
  Tags,
  MousePointer,
  Zap,
  GitBranch,
  Webhook,
  Shield,
} from 'lucide-react'

const features = [
  {
    icon: FileText,
    title: 'HTML to Markdown',
    description: 'Convert HTML to clean GitHub-flavored Markdown with code blocks preserved.',
  },
  {
    icon: BookOpen,
    title: 'Content Extraction',
    description: 'Extract main content using Readability, filtering ads and navigation.',
  },
  {
    icon: Tags,
    title: 'Metadata Parsing',
    description: 'Extract Open Graph, Twitter Cards, favicon, and structured data.',
  },
  {
    icon: MousePointer,
    title: 'Page Actions',
    description: 'Click, scroll, type, and wait before scraping for dynamic content.',
  },
  {
    icon: Zap,
    title: 'Smart Caching',
    description: 'Configurable caching with SHA-256 request hashing for fast repeats.',
  },
  {
    icon: GitBranch,
    title: 'Async Processing',
    description: 'BullMQ-powered queue with retries and exponential backoff.',
  },
  {
    icon: Webhook,
    title: 'Webhook Callbacks',
    description: 'Get notified when crawl and batch jobs complete via webhooks.',
  },
  {
    icon: Shield,
    title: 'SSRF Protection',
    description: 'Built-in URL validation prevents internal network access.',
  },
]

export function FeaturesSection() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-16 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
            FEATURES
          </h2>
          <p className="mt-4 text-muted-foreground">
            Everything you need for production-grade web scraping
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-border bg-card p-5 transition-colors hover:border-foreground/20"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center border border-border bg-background">
                <feature.icon className="h-4 w-4" />
              </div>
              <h3 className="font-mono text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
