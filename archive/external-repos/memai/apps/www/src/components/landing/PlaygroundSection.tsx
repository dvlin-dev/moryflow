import { Container } from '@/components/layout'
import { QuickPlayground } from '@/components/playground/QuickPlayground'

export function PlaygroundSection() {
  return (
    <section className="border-b border-border py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
            TRY IT NOW
          </h2>
          <p className="mt-4 text-muted-foreground">
            Search our demo memories and see semantic search in action
          </p>
        </div>

        {/* Playground */}
        <QuickPlayground />
      </Container>
    </section>
  )
}
