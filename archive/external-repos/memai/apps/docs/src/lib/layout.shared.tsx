import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { i18n } from './i18n'

export function baseOptions(locale?: string): BaseLayoutProps {
  const isZh = locale === 'zh'

  return {
    i18n,
    nav: {
      title: 'Memai',
    },
    links: [
      {
        text: isZh ? '控制台' : 'Console',
        url: 'https://console.memai.dev',
        external: true,
      },
      {
        text: isZh ? 'API 参考' : 'API Reference',
        url: locale ? `/${locale}/docs/api-reference` : '/docs/api-reference',
      },
      {
        text: isZh ? '状态' : 'Status',
        url: 'https://status.memai.dev',
        external: true,
      },
      {
        text: 'GitHub',
        url: 'https://github.com/memai',
        external: true,
      },
    ],
  }
}
