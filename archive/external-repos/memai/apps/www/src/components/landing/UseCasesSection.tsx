import { Container } from '@/components/layout'
import { Brain, Network, Search, Sparkles } from 'lucide-react'

const useCases = [
  {
    icon: Brain,
    title: 'AI Agent Memory',
    description:
      'Give your AI assistants persistent memory across sessions. Remember user preferences, past conversations, and context.',
  },
  {
    icon: Network,
    title: 'Knowledge Graphs',
    description:
      'Automatically build and query knowledge graphs from stored memories. Understand relationships between entities.',
  },
  {
    icon: Search,
    title: 'Semantic Search',
    description:
      'Find relevant memories using natural language queries. Vector embeddings for accurate similarity matching.',
  },
  {
    icon: Sparkles,
    title: 'Entity Extraction',
    description:
      'Automatically extract people, places, dates, and concepts from text. Structured data from unstructured content.',
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
            From AI assistants to knowledge management, one API for all your memory needs
          </p>
        </div>

        {/* Use Case Grid */}
        <div className="grid gap-6 md:grid-cols-2">
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
