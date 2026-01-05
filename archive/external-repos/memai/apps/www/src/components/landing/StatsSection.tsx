import { Container } from '@/components/layout'

const stats = [
  { value: '10M+', label: 'Memories Stored' },
  { value: '<100ms', label: 'Search Latency' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '1536', label: 'Vector Dimensions' },
]

export function StatsSection() {
  return (
    <section className="border-b border-border bg-muted/30 py-16 md:py-20">
      <Container>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
                {stat.value}
              </div>
              <div className="mt-2 font-mono text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
