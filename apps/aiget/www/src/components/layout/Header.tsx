/**
 * [PROPS]: None
 * [EMITS]: Navigation events (client routing / external links)
 * [POS]: Aiget 官网全局顶部导航（模块入口 + 外链入口 + 用户入口）
 */

import { Link } from '@tanstack/react-router';
import { Container } from './Container';
import { Button, Skeleton } from '@aiget/ui';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const { isLoading, isAuthenticated } = useAuth();

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
            <Link
              to="/dashboard"
              className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Digest
            </Link>
            <a
              href="https://docs.aiget.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <a href="https://console.aiget.dev" className="hidden sm:block">
              <Button variant="outline" size="sm" className="font-mono">
                Console
              </Button>
            </a>
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm" className="font-mono">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm" className="font-mono">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
