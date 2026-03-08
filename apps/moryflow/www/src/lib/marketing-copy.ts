import { t, type Locale } from './i18n';

export type FooterLink =
  | { label: string; path: string; external?: never; href?: never }
  | { label: string; href: string; external?: boolean; path?: never };

export interface FooterGroup {
  titleKey: string;
  links: FooterLink[];
}

export function getFooterGroups(locale: Locale): FooterGroup[] {
  return [
    {
      titleKey: 'footer.product',
      links: [
        { label: t('nav.features', locale), path: '/features' },
        { label: t('nav.useCases', locale), path: '/use-cases' },
        { label: t('nav.download', locale), path: '/download' },
        { label: t('footer.pricing', locale), path: '/pricing' },
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
        { label: t('nav.docs', locale), href: 'https://docs.moryflow.com/', external: true },
        { label: t('page.telegramAiAgent', locale), path: '/telegram-ai-agent' },
        { label: t('page.notesToWebsite', locale), path: '/notes-to-website' },
      ],
    },
    {
      titleKey: 'footer.company',
      links: [
        { label: t('footer.about', locale), path: '/about' },
        { label: t('footer.privacy', locale), path: '/privacy' },
        { label: t('footer.terms', locale), path: '/terms' },
        { label: t('footer.contact', locale), href: 'mailto:hello@moryflow.com' },
      ],
    },
  ];
}

export function getDownloadCtaDefaults(locale: Locale) {
  return {
    buttonLabel: t('cta.downloadMoryflow', locale),
    subtitle: t('cta.freeBetaFull', locale),
  };
}
