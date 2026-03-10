/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Site footer — brand + Product / Compare / Resources / Company link groups
 */

'use client';

import { Link } from '@tanstack/react-router';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getFooterGroups, type FooterLink } from '@/lib/marketing-copy';
import { getPageHref } from '@/lib/site-pages';

function FooterLinkItem({
  link,
  locale,
}: {
  link: FooterLink;
  locale: ReturnType<typeof useLocale>;
}) {
  const className = 'text-sm text-tertiary hover:text-foreground transition-colors';

  if ('path' in link) {
    return (
      <Link to={getPageHref(link.path ?? '/', locale)} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <a
      href={link.href}
      className={className}
      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {link.label}
    </a>
  );
}

export function Footer() {
  const locale = useLocale();
  const homeHref = getPageHref('/', locale);
  const footerGroups = getFooterGroups(locale);

  return (
    <footer className="border-t border-border bg-card py-12 sm:py-16 px-4 sm:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to={homeHref} className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Moryflow Logo" className="w-8 h-8 object-contain" />
              <span className="font-bold text-lg tracking-tight text-foreground">Moryflow</span>
            </Link>
            <p className="text-sm text-tertiary leading-relaxed max-w-[200px]">
              {t('footer.tagline', locale)}
            </p>
          </div>

          {/* Link Groups */}
          {footerGroups.map((group) => (
            <div key={group.titleKey} className="space-y-3">
              <h3 className="font-medium text-sm text-foreground">{t(group.titleKey, locale)}</h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <FooterLinkItem link={link} locale={locale} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-tertiary">
          <span>&copy; {new Date().getFullYear()} Moryflow</span>
          <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-medium">
            Beta
          </span>
        </div>
      </div>
    </footer>
  );
}
