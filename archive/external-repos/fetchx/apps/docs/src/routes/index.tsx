import { createFileRoute, Link } from '@tanstack/react-router'

// @ts-expect-error - Route path is generated at build time
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      {
        title: 'AIGet - Web Screenshot API',
      },
      {
        name: 'description',
        content: 'Capture screenshots of any webpage instantly with our simple REST API. Built for developers.',
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
          <span className="font-semibold text-xl">AIGet</span>
          <nav className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-foreground font-medium">EN</span>
              <Link to="/zh" className="hover:text-foreground transition-colors">
                中文
              </Link>
            </div>
            <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </Link>
            <a
              href="https://console.aiget.dev"
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
          Web Screenshot API
          <br />
          <span className="text-primary">for Developers</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Capture high-quality screenshots of any webpage with a simple REST API.
          Fast, reliable, and affordable.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/docs"
            className="bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors"
          >
            Read the Docs
          </Link>
          <a
            href="https://console.aiget.dev"
            className="border px-6 py-3 font-medium hover:bg-muted transition-colors"
          >
            Try it Free →
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
              <code className="text-green-600 dark:text-green-400">{`curl -X POST https://api.aiget.dev/v1/screenshots \\
  -H "Authorization: Bearer lk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}</code>
            </pre>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">⚡ Fast</h3>
            <p className="text-muted-foreground">Screenshots delivered in under 3 seconds via Cloudflare's global CDN.</p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">🔒 Secure</h3>
            <p className="text-muted-foreground">SSRF protection, private IP blocking, and encrypted storage by default.</p>
          </div>
          <div className="p-6 border bg-card">
            <h3 className="font-semibold text-lg mb-2">💰 Affordable</h3>
            <p className="text-muted-foreground">100 free screenshots/month. Paid plans start at just $9/month.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AIGet. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
