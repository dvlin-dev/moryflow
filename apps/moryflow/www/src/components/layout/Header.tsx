/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Top navigation — frosted glass on scroll, Compare dropdown + Pricing + Docs + GitHub ★ + Download CTA
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { Download, Menu, X, ChevronDown, Star } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetClose } from '@moryflow/ui';
import { cn } from '../../lib/cn';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';
import { useGitHubStars, formatStarCount } from '@/hooks/useGitHubStars';

const GITHUB_URL = 'https://github.com/dvlin-dev/moryflow';

const COMPARE_LINKS = [
  { pageId: 'openclaw', label: 'OpenClaw' },
  { pageId: 'cowork', label: 'Cowork' },
  { pageId: 'obsidian', label: 'Obsidian' },
  { pageId: 'manus', label: 'Manus' },
  { pageId: 'notion', label: 'Notion' },
] as const;

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const compareRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const homeHref = getPageHref('/', locale);
  const downloadHref = getPageHref('/download', locale);
  const pricingHref = getPageHref('/pricing', locale);
  const stars = useGitHubStars();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close compare dropdown on outside click
  useEffect(() => {
    if (!compareOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (compareRef.current && !compareRef.current.contains(e.target as Node)) {
        setCompareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [compareOpen]);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-8 py-4',
        isScrolled ? 'pt-4' : 'pt-6'
      )}
    >
      <div
        className={cn(
          'max-w-7xl mx-auto rounded-2xl transition-all duration-300 flex items-center justify-between px-6 py-3',
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border border-border shadow-sm'
            : 'bg-transparent'
        )}
      >
        {/* Left: Brand + Nav */}
        <div className="flex items-center gap-8">
          <Link to={homeHref} className="flex items-center gap-2.5 group">
            <img
              src="/logo.svg"
              alt="Moryflow Logo"
              className="w-7 h-7 object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-bold text-xl tracking-tight text-foreground">Moryflow</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {/* Compare Dropdown */}
            <div ref={compareRef} className="relative">
              <button
                onClick={() => setCompareOpen(!compareOpen)}
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('nav.compare', locale)}
                <ChevronDown
                  size={14}
                  className={cn('transition-transform', compareOpen && 'rotate-180')}
                />
              </button>
              {compareOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-border bg-card shadow-lg py-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  {COMPARE_LINKS.map((item) => (
                    <Link
                      key={item.pageId}
                      to={getPageHref(`/compare/${item.pageId}`, locale)}
                      className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                      onClick={() => setCompareOpen(false)}
                    >
                      vs {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to={pricingHref}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nav.pricing', locale)}
            </Link>

            <a
              href="https://docs.moryflow.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nav.docs', locale)}
            </a>

            {/* GitHub Star */}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Star size={14} className="text-brand" />
              {stars !== null ? formatStarCount(stars) : t('nav.github', locale)}
            </a>
          </div>
        </div>

        {/* Right: CTA + Mobile Menu */}
        <div className="flex items-center gap-3">
          <Button
            asChild
            className="bg-foreground text-background hover:bg-foreground/90 rounded-xl text-sm font-medium px-5 py-2.5 cursor-pointer transition-all hover:shadow-md"
            data-track-cta="header-download"
          >
            <Link to={downloadHref}>
              <Download size={16} />
              <span className="hidden sm:inline">{t('nav.download', locale)}</span>
            </Link>
          </Button>

          {/* Mobile Hamburger Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-background p-6">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="flex items-center justify-between mb-8">
                <Link to={homeHref} className="flex items-center gap-2.5">
                  <img src="/logo.svg" alt="Moryflow" className="w-7 h-7 object-contain" />
                  <span className="font-bold text-xl tracking-tight text-foreground">Moryflow</span>
                </Link>
                <SheetClose className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </SheetClose>
              </div>
              <div className="flex flex-col gap-4">
                {/* Compare section */}
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-tertiary">
                  {t('nav.compare', locale)}
                </span>
                {COMPARE_LINKS.map((item) => (
                  <SheetClose key={item.pageId} asChild>
                    <Link
                      to={getPageHref(`/compare/${item.pageId}`, locale)}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 pl-3"
                    >
                      vs {item.label}
                    </Link>
                  </SheetClose>
                ))}

                <div className="border-t border-border my-2" />

                <SheetClose asChild>
                  <Link
                    to={pricingHref}
                    className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {t('nav.pricing', locale)}
                  </Link>
                </SheetClose>
                <a
                  href="https://docs.moryflow.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {t('nav.docs', locale)}
                </a>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Star size={16} className="text-brand" />
                  {t('nav.github', locale)}
                  {stars !== null && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand font-semibold">
                      {formatStarCount(stars)}
                    </span>
                  )}
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
