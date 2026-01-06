import { createFileRoute, Link } from '@tanstack/react-router'
import { DownloadButtons } from '@/components/download-buttons'

// @ts-expect-error - Route path is generated at build time
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      {
        title: 'MoryFlow - Your AI Note-Taking Companion',
      },
      {
        name: 'description',
        content: 'MoryFlow is a note-taking app with a built-in AI assistant that reads your notes, remembers what you\'ve said, and helps you get things done.',
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
          <span className="font-semibold text-xl">MoryFlow</span>
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
              href="https://moryflow.com/download"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Download
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Your AI Note-Taking
          <br />
          <span className="text-primary">Companion</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          MoryFlow is a note-taking app with a built-in AI assistant called Mory.
          It reads your notes, remembers what you've said, and helps you get things done.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/docs"
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            to="/docs/features"
            className="border px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
          >
            Explore Features
          </Link>
        </div>

        {/* Download Buttons */}
        <div className="mt-12 flex justify-center">
          <DownloadButtons locale="en" />
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Remembers What You've Said</h3>
            <p className="text-muted-foreground">
              Mory reads your notes and learns your habits and preferences.
              The more you chat, the better it understands you.
            </p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Notes Stay on Your Computer</h3>
            <p className="text-muted-foreground">
              All your content is stored as regular files on your own computer.
              Nothing uploaded, nothing shared, works offline too.
            </p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Actually Gets Things Done</h3>
            <p className="text-muted-foreground">
              Not just chat—helps you prep for exams, plan events, organize trips,
              and write work summaries.
            </p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Feels Natural to Write</h3>
            <p className="text-muted-foreground">
              Familiar editing experience with Markdown, code blocks, and tables.
              Just write what comes to mind.
            </p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Use Any AI You Want</h3>
            <p className="text-muted-foreground">
              Supports OpenAI, Claude, DeepSeek, and 20+ providers.
              Or run local models completely offline.
            </p>
          </div>
          <div className="p-6 border bg-card rounded-lg">
            <h3 className="font-semibold text-lg mb-2">Always Getting Better</h3>
            <p className="text-muted-foreground">
              We're constantly improving and adding new features.
              Download free now and grow with us.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-24">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MoryFlow. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
