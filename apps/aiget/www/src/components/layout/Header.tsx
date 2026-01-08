/**
 * [PROPS]: None
 * [EMITS]: Navigation events (client routing / external links)
 * [POS]: Aiget 官网全局顶部导航（模块入口 + 外链入口）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 apps/aiget/www/CLAUDE.md。
 */

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
            <Link
              to="/fetchx"
              className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Fetchx
            </Link>
            <Link
              to="/memox"
              className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Memox
            </Link>
            <a
              href="https://docs.aiget.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </a>
            <a
              href="https://server.aiget.dev/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              API Docs
            </a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <a href="https://console.aiget.dev">
              <Button variant="outline" size="sm" className="font-mono">
                Console
              </Button>
            </a>
            <a href="https://admin.aiget.dev" className="hidden sm:block">
              <Button variant="outline" size="sm" className="font-mono">
                Admin
              </Button>
            </a>
          </div>
        </div>
      </Container>
    </header>
  );
}
