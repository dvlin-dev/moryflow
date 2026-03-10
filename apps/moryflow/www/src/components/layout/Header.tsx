/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Top navigation — frosted glass on scroll, brand + nav links + Download CTA
 */

'use client';

import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Download, Menu, X } from 'lucide-react';
import { Button } from '@moryflow/ui';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetClose } from '@moryflow/ui';
import { cn } from '../../lib/cn';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const locale = useLocale();
  const homeHref = getPageHref('/', locale);
  const downloadHref = getPageHref('/download', locale);

  const navLinks = [
    { href: '/features', label: t('nav.product', locale) },
    { href: '/use-cases', label: t('nav.useCases', locale) },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={getPageHref(link.href, locale)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://docs.moryflow.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nav.docs', locale)}
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
                {navLinks.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <Link
                      to={getPageHref(link.href, locale)}
                      className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                <a
                  href="https://docs.moryflow.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  {t('nav.docs', locale)}
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
