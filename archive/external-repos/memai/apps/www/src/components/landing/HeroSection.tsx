import { Container } from '@/components/layout'
import { Button } from '@memai/ui/primitives'
import { ArrowRight, Brain, Github } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background">
      {/* Grid background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <Container className="relative">
        <div className="flex flex-col items-center py-24 text-center md:py-32 lg:py-40">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 border border-border bg-muted/50 px-3 py-1 font-mono text-xs">
            <Brain className="h-3 w-3" />
            <span>Semantic Memory API for AI Agents</span>
          </div>

          {/* Headline */}
          <h1 className="max-w-4xl font-mono text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            GIVE YOUR AI
            <br />
            <span className="text-muted-foreground">LONG-TERM MEMORY</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Semantic memory infrastructure for AI applications. Store, search, and
            retrieve memories with vector embeddings and knowledge graphs.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a href="https://console.memai.dev/signup">
              <Button size="lg" className="font-mono">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="https://docs.memai.dev">
              <Button variant="outline" size="lg" className="font-mono">
                Read the Docs
              </Button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground">
            <a
              href="https://github.com/dvlin-dev/memai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-colors hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              <span className="font-mono">Open Source</span>
            </a>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-green-500" />
              <span className="font-mono">99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-blue-500" />
              <span className="font-mono">&lt;100ms Search</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-purple-500" />
              <span className="font-mono">pgvector Powered</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
