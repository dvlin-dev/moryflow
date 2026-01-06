import { Link } from '@tanstack/react-router';
import { Container } from './Container';
import { Button } from '@aiget/ui/primitives';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-mono text-xl font-bold tracking-tight">AIGET</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="https://github.com/nicepkg/aiget"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <a href="https://console.aiget.dev">
              <Button variant="outline" size="sm" className="font-mono">
                Console
              </Button>
            </a>
          </div>
        </div>
      </Container>
    </header>
  );
}
