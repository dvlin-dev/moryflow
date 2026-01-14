/**
 * [PROPS]: None
 * [EMITS]: Navigation events (client routing / external links)
 * [POS]: Aiget 官网全局顶部导航 - Notion 风格，C 端优先 + Developers 下拉
 */

import { useState, useRef, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Menu01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { Container } from './Container';
import { Button, Icon, Skeleton, cn } from '@aiget/ui';
import { useAuth } from '@/lib/auth-context';
import { DEVELOPER_PRODUCTS, DEVELOPER_RESOURCES, type NavMenuItem } from '@/lib/navigation';

export function Header() {
  const { isLoading, isAuthenticated } = useAuth();
  const [developerMenuOpen, setDeveloperMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDevOpen, setMobileDevOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理 hover 开启
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setDeveloperMenuOpen(true);
  };

  // 处理 hover 关闭（带延迟）
  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setDeveloperMenuOpen(false);
    }, 100);
  };

  // 点击外部关闭 + 清理 timeout
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setDeveloperMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">AIGET</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className="px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground rounded-lg hover:bg-muted"
            >
              Digest
            </Link>
            <Link
              to="/pricing"
              className="px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground rounded-lg hover:bg-muted"
            >
              Pricing
            </Link>

            {/* Developers Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                ref={triggerRef}
                onClick={() => setDeveloperMenuOpen(!developerMenuOpen)}
                className={cn(
                  'flex items-center gap-1 px-4 py-2 text-sm transition-colors rounded-lg',
                  developerMenuOpen
                    ? 'text-foreground bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                Developers
                <Icon
                  icon={ArrowDown01Icon}
                  className={cn(
                    'h-4 w-4 transition-transform duration-150',
                    developerMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Mega Menu Panel */}
              <div
                ref={menuRef}
                className={cn(
                  'absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[540px] origin-top transition-all duration-150',
                  developerMenuOpen
                    ? 'opacity-100 scale-100 pointer-events-auto'
                    : 'opacity-0 scale-95 pointer-events-none'
                )}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="rounded-xl border border-border bg-background shadow-lg p-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Products Column */}
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Products
                      </h3>
                      <div className="space-y-1">
                        {DEVELOPER_PRODUCTS.map((item) => (
                          <MenuItemLink
                            key={item.title}
                            item={item}
                            onClose={() => setDeveloperMenuOpen(false)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Resources Column */}
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Resources
                      </h3>
                      <div className="space-y-1">
                        {DEVELOPER_RESOURCES.map((item) => (
                          <MenuItemLink
                            key={item.title}
                            item={item}
                            onClose={() => setDeveloperMenuOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-6 pt-4 border-t border-border">
                    <a
                      href="https://console.aiget.dev"
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <Icon icon={ArrowRight01Icon} className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">Get Started</div>
                          <div className="text-xs text-muted-foreground">
                            Free tier available · No credit card required
                          </div>
                        </div>
                      </div>
                      <Icon
                        icon={ArrowRight01Icon}
                        className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform"
                      />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <Skeleton className="h-9 w-20" />
            ) : isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Icon icon={mobileMenuOpen ? Cancel01Icon : Menu01Icon} className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-200',
            mobileMenuOpen ? 'max-h-[500px] pb-4' : 'max-h-0'
          )}
        >
          <nav className="flex flex-col gap-1 pt-2">
            <Link
              to="/dashboard"
              className="px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Digest
            </Link>
            <Link
              to="/pricing"
              className="px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>

            {/* Mobile Developers Accordion */}
            <div>
              <button
                className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileDevOpen(!mobileDevOpen)}
              >
                Developers
                <Icon
                  icon={ArrowDown01Icon}
                  className={cn('h-4 w-4 transition-transform', mobileDevOpen && 'rotate-180')}
                />
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  mobileDevOpen ? 'max-h-[400px]' : 'max-h-0'
                )}
              >
                <div className="pl-3 pt-1 space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
                    Products
                  </div>
                  {DEVELOPER_PRODUCTS.map((item) => (
                    <MobileMenuItem
                      key={item.title}
                      item={item}
                      onClose={() => setMobileMenuOpen(false)}
                    />
                  ))}
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2 mt-2">
                    Resources
                  </div>
                  {DEVELOPER_RESOURCES.map((item) => (
                    <MobileMenuItem
                      key={item.title}
                      item={item}
                      onClose={() => setMobileMenuOpen(false)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Auth */}
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : isAuthenticated ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full" size="sm">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full" size="sm">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </Container>
    </header>
  );
}

// Menu Item Link Component
interface MenuItemProps {
  item: NavMenuItem;
  onClose: () => void;
}

function MenuItemLink({ item, onClose }: MenuItemProps) {
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted transition-colors group">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background group-hover:border-primary/50 transition-colors">
        <Icon
          icon={item.icon}
          className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"
        />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{item.title}</div>
        <div className="text-xs text-muted-foreground">{item.description}</div>
      </div>
    </div>
  );

  if (item.internal) {
    return (
      <Link to={item.href as '/fetchx' | '/memox'} onClick={onClose}>
        {content}
      </Link>
    );
  }

  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
      {content}
    </a>
  );
}

// Mobile Menu Item
function MobileMenuItem({ item, onClose }: MenuItemProps) {
  const content = (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
      <Icon icon={item.icon} className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{item.title}</span>
    </div>
  );

  if (item.internal) {
    return (
      <Link to={item.href as '/fetchx' | '/memox'} onClick={onClose}>
        {content}
      </Link>
    );
  }

  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
      {content}
    </a>
  );
}
