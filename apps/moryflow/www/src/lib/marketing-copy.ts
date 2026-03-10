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
        { label: t('nav.download', locale), path: '/download' },
        { label: t('footer.pricing', locale), path: '/pricing' },
      ],
    },
    {
      titleKey: 'footer.compare',
      links: [
        { label: 'vs OpenClaw', path: '/compare/openclaw' },
        { label: 'vs Manus', path: '/compare/manus' },
        { label: 'vs Cowork', path: '/compare/cowork' },
        { label: 'vs Obsidian', path: '/compare/obsidian' },
        { label: 'vs Notion', path: '/compare/notion' },
      ],
    },
    {
      titleKey: 'footer.resources',
      links: [
        { label: t('nav.docs', locale), href: 'https://docs.moryflow.com/', external: true },
        {
          label: t('footer.github', locale),
          href: 'https://github.com/dvlin-dev/moryflow',
          external: true,
        },
        {
          label: t('footer.releaseNotes', locale),
          href: 'https://github.com/dvlin-dev/moryflow/releases',
          external: true,
        },
      ],
    },
    {
      titleKey: 'footer.legal',
      links: [
        { label: t('footer.privacy', locale), path: '/privacy' },
        { label: t('footer.terms', locale), path: '/terms' },
      ],
    },
  ];
}

export function getDownloadCtaDefaults(locale: Locale) {
  return {
    buttonLabel: t('cta.downloadMoryflow', locale),
    subtitle: t('home.hero.freeToStart', locale),
  };
}
