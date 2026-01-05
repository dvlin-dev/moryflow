import { useState } from 'react'
import { Container } from '@/components/layout'
import { cn } from '@memai/ui/lib'

const languages = ['curl', 'typescript'] as const
type Language = (typeof languages)[number]

const codeExamples: Record<Language, string> = {
  curl: `# Store a memory
curl -X POST https://server.memai.dev/v1/memories \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "User prefers dark mode and concise responses",
    "userId": "user_123",
    "tags": ["preferences", "ui"]
  }'

# Search memories
curl -X POST https://server.memai.dev/v1/memories/search \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{ "query": "user preferences", "limit": 5 }'`,
  typescript: `import { Memai } from '@memai/sdk';

const client = new Memai('YOUR_API_KEY');

// Store a memory
await client.memories.create({
  content: 'User prefers dark mode and concise responses',
  userId: 'user_123',
  tags: ['preferences', 'ui'],
});

// Search memories
const results = await client.memories.search({
  query: 'user preferences',
  limit: 5,
});

console.log(results);`,
}

export function CodeExampleSection() {
  const [activeLanguage, setActiveLanguage] = useState<Language>('curl')

  return (
    <section className="border-b border-border bg-muted/30 py-20 md:py-28">
      <Container>
        {/* Section Header */}
        <div className="mb-12 text-center">
          <h2 className="font-mono text-3xl font-bold tracking-tight md:text-4xl">
            SIMPLE API
          </h2>
          <p className="mt-4 text-muted-foreground">
            Store and search memories with a simple API.
          </p>
        </div>

        {/* Code Block */}
        <div className="mx-auto max-w-3xl overflow-hidden border border-border bg-background">
          {/* Language Tabs */}
          <div className="flex border-b border-border">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLanguage(lang)}
                className={cn(
                  'px-4 py-2 font-mono text-sm transition-colors',
                  activeLanguage === lang
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {lang}
              </button>
            ))}
            <a
              href="https://github.com/dvlin-dev/memai/issues/new?title=SDK%20Request%3A%20%5BLanguage%5D"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 font-mono text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              more...
            </a>
          </div>

          {/* Code Content */}
          <div className="overflow-x-auto p-4">
            <pre className="font-mono text-sm leading-relaxed">
              <code>{codeExamples[activeLanguage]}</code>
            </pre>
          </div>
        </div>
      </Container>
    </section>
  )
}
