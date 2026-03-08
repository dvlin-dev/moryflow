/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Notion-style footer — Product / Compare / Resources / Company link groups
 */

'use client';

import { Link } from '@tanstack/react-router';
import { useLocale } from '@/routes/{-$locale}/route';
import { t } from '@/lib/i18n';
import { getPageHref } from '@/lib/site-pages';

type FooterLink =
  | { label: string; path: string; external?: never; href?: never }
  | { label: string; href: string; external?: boolean; path?: never };

interface FooterGroup {
  titleKey: string;
  links: FooterLink[];
}

const footerGroups: FooterGroup[] = [
  {
    titleKey: 'footer.product',
    links: [
      { label: 'Features', path: '/features' },
      { label: 'Use Cases', path: '/use-cases' },
      { label: 'Download', path: '/download' },
      { label: 'Pricing', path: '/pricing' },
    ],
  },
  {
    titleKey: 'footer.compare',
    links: [
      { label: 'vs Notion', path: '/compare/notion' },
      { label: 'vs Obsidian', path: '/compare/obsidian' },
      { label: 'vs Manus', path: '/compare/manus' },
      { label: 'vs Cowork', path: '/compare/cowork' },
      { label: 'vs OpenClaw', path: '/compare/openclaw' },
    ],
  },
  {
    titleKey: 'footer.resources',
    links: [
      { label: 'Docs', href: 'https://docs.moryflow.com/', external: true },
      { label: 'Telegram AI Agent', path: '/telegram-ai-agent' },
      { label: 'Notes to Website', path: '/notes-to-website' },
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      { label: 'About', path: '/about' },
      { label: 'Privacy', path: '/privacy' },
      { label: 'Terms', path: '/terms' },
      { label: 'Contact', href: 'mailto:hello@moryflow.com' },
    ],
  },
];

function FooterLinkItem({
  link,
  locale,
}: {
  link: FooterLink;
  locale: ReturnType<typeof useLocale>;
}) {
  const className =
    'text-sm text-mory-text-tertiary hover:text-mory-text-primary transition-colors';

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

  return (
    <footer className="border-t border-mory-border bg-mory-bg py-12 sm:py-16 px-4 sm:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to={homeHref} className="flex items-center gap-2">
              <img src="/logo.svg" alt="Moryflow Logo" className="w-8 h-8 object-contain" />
              <span className="font-serif font-bold text-lg text-mory-text-primary">Moryflow</span>
            </Link>
            <p className="text-sm text-mory-text-tertiary leading-relaxed max-w-[200px]">
              {t('footer.tagline', locale)}
            </p>
          </div>

          {/* Link Groups */}
          {footerGroups.map((group) => (
            <div key={group.titleKey} className="space-y-3">
              <h3 className="font-medium text-sm text-mory-text-primary">
                {t(group.titleKey, locale)}
              </h3>
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
        <div className="mt-12 pt-6 border-t border-mory-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-mory-text-tertiary">
          <span>&copy; {new Date().getFullYear()} Moryflow</span>
          <span className="px-3 py-1 bg-mory-paper rounded-full text-xs font-medium text-mory-text-secondary border border-mory-border">
            Beta
          </span>
        </div>
      </div>
    </footer>
  );
}
