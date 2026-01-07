import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { i18n } from './i18n';

export function baseOptions(locale?: string): BaseLayoutProps {
  const isZh = locale === 'zh';

  return {
    i18n,
    nav: {
      title: 'MoryFlow',
    },
    links: [
      {
        text: isZh ? '下载' : 'Download',
        url: 'https://moryflow.com/download',
        external: true,
      },
      {
        text: isZh ? '功能' : 'Features',
        url: locale ? `/${locale}/docs/features` : '/docs/features',
      },
      {
        text: 'GitHub',
        url: 'https://github.com/dvlin-dev/moryflow',
        external: true,
      },
    ],
  };
}
