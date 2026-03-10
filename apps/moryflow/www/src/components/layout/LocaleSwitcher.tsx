'use client';

import { Link, useLocation } from '@tanstack/react-router';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { SheetClose } from '@moryflow/ui';
import { cn } from '../../lib/cn';
import { useLocale } from '@/routes/{-$locale}/route';
import { SUPPORTED_LOCALES, LOCALE_DISPLAY_NAMES, t, type Locale } from '@/lib/i18n';
import { getLocaleSwitchHref } from '@/lib/site-pages';
import { useDropdown } from '@/hooks/useDropdown';

interface LocaleSwitcherProps {
  variant: 'desktop' | 'mobile';
}

export function LocaleSwitcher({ variant }: LocaleSwitcherProps) {
  const locale = useLocale();
  const { pathname } = useLocation();

  if (variant === 'mobile') {
    return <MobileLocaleSwitcher locale={locale} pathname={pathname} />;
  }
  return <DesktopLocaleSwitcher locale={locale} pathname={pathname} />;
}

function DesktopLocaleSwitcher({ locale, pathname }: { locale: Locale; pathname: string }) {
  const { isOpen, toggle, close, containerRef } = useDropdown<HTMLDivElement>();
  const display = LOCALE_DISPLAY_NAMES[locale];

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('nav.switchLocale', locale)}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Globe size={14} />
        {display.shortLabel}
        <ChevronDown size={14} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div
          role="listbox"
          aria-label={t('nav.language', locale)}
          className="absolute top-full right-0 mt-2 w-44 rounded-xl border border-border bg-card shadow-lg py-2 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {SUPPORTED_LOCALES.map((targetLocale) => {
            const isCurrent = targetLocale === locale;
            const { href, available } = getLocaleSwitchHref(pathname, targetLocale);
            const targetDisplay = LOCALE_DISPLAY_NAMES[targetLocale];
            const disabled = !available || isCurrent;

            if (disabled) {
              return (
                <span
                  key={targetLocale}
                  role="option"
                  aria-selected={isCurrent}
                  aria-disabled={!available}
                  className={cn(
                    'flex items-center justify-between px-4 py-2 text-sm transition-colors',
                    isCurrent
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground/50 cursor-not-allowed'
                  )}
                >
                  <span>{targetDisplay.nativeName}</span>
                  {isCurrent && <Check size={14} className="text-brand" />}
                </span>
              );
            }

            return (
              <Link
                key={targetLocale}
                to={href}
                role="option"
                aria-selected={false}
                onClick={close}
                className="flex items-center justify-between px-4 py-2 text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer"
              >
                <span>{targetDisplay.nativeName}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileLocaleSwitcher({ locale, pathname }: { locale: Locale; pathname: string }) {
  return (
    <>
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-tertiary">
        {t('nav.language', locale)}
      </span>
      {SUPPORTED_LOCALES.map((targetLocale) => {
        const isCurrent = targetLocale === locale;
        const { href, available } = getLocaleSwitchHref(pathname, targetLocale);
        const targetDisplay = LOCALE_DISPLAY_NAMES[targetLocale];
        const disabled = !available || isCurrent;

        if (disabled && !isCurrent) {
          return (
            <span
              key={targetLocale}
              className="flex items-center justify-between text-sm font-medium text-muted-foreground/50 py-1 pl-3 cursor-not-allowed"
            >
              {targetDisplay.nativeName}
            </span>
          );
        }

        if (isCurrent) {
          return (
            <span
              key={targetLocale}
              className="flex items-center justify-between text-sm font-medium text-foreground py-1 pl-3"
            >
              {targetDisplay.nativeName}
              <Check size={14} className="text-brand" />
            </span>
          );
        }

        return (
          <SheetClose key={targetLocale} asChild>
            <Link
              to={href}
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 pl-3"
            >
              {targetDisplay.nativeName}
            </Link>
          </SheetClose>
        );
      })}
    </>
  );
}
