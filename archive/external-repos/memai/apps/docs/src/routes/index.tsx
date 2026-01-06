import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Memai - Memory as a Service for AI' },
      {
        name: 'description',
        content:
          'Build persistent memory layers for your AI applications. Store, search, and manage memories with a simple REST API.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-semibold text-xl">Memai</span>
          <nav className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">EN</span>
              <Link
                to="/$lang"
                params={{ lang: 'zh' }}
                className="hover:text-foreground transition-colors"
              >
                中文
              </Link>
            </div>
            <a
              href="/docs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Documentation
            </a>
            <a
              href="https://console.memai.dev"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 transition-colors"
            >
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Memory as a Service
          <br />
          <span className="text-primary">for AI Applications</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Build persistent memory layers for your AI applications. Store, search, and manage
          memories with a simple REST API.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href="/docs"
            className="bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </a>
          <a
            href="/docs/api-reference"
            className="border px-6 py-3 font-medium hover:bg-muted transition-colors"
          >
            View API
          </a>
        </div>

        {/* Code Example */}
        <div className="mt-16 max-w-2xl mx-auto text-left">
          <div className="bg-card border overflow-hidden shadow-lg">
            <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-sm text-muted-foreground">Terminal</span>
            </div>
            <pre className="p-4 text-sm overflow-x-auto">
              <code className="text-green-600 dark:text-green-400">{`curl -X POST https://api.memai.dev/v1/memories \\
  -H "Authorization: Bearer mm_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "User prefers dark mode",
    "user_id": "user_123"
  }'`}</code>
            </pre>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">Semantic Search</h3>
            <p className="text-muted-foreground">
              Find relevant memories using natural language queries powered by vector embeddings.
            </p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">Knowledge Graph</h3>
            <p className="text-muted-foreground">
              Automatically extract entities and relationships to build connected knowledge.
            </p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">Multi-tenant</h3>
            <p className="text-muted-foreground">
              Isolate memories by user, session, or agent with built-in scoping and access control.
            </p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">Real-time Webhooks</h3>
            <p className="text-muted-foreground">
              Get notified instantly when memories are created, updated, or deleted.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Memai. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
