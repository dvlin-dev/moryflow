import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n } from './i18n';

export function baseOptions(locale?: string): BaseLayoutProps {
  const isZh = locale === 'zh';

  return {
    i18n,
    nav: {
      title: 'Anyhunt',
    },
    links: [
      {
        text: isZh ? '控制台' : 'Console',
        url: 'https://console.anyhunt.app',
        external: true,
      },
      {
        text: isZh ? 'API 参考' : 'API Reference',
        url: locale ? `/${locale}/docs/api` : '/docs/api',
      },
      {
        text: isZh ? '状态' : 'Status',
        url: 'https://status.anyhunt.app',
        external: true,
      },
      {
        text: 'GitHub',
        url: 'https://github.com/anyhunt',
        external: true,
      },
    ],
  };
}
