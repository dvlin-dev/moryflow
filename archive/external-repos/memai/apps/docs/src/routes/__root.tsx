import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useParams,
} from '@tanstack/react-router'
import * as React from 'react'
import { I18nProvider } from 'fumadocs-ui/i18n'
import { Providers } from '../components/providers'
import { i18n } from '../lib/i18n'
import '../styles/app.css'

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Memai Documentation',
      },
      {
        name: 'description',
        content:
          'Memory as a Service for AI Applications - Store, search, and manage memories with a simple REST API',
      },
      // Open Graph
      {
        property: 'og:title',
        content: 'Memai - Memory as a Service for AI',
      },
      {
        property: 'og:description',
        content:
          'Build persistent memory layers for your AI applications. Store, search, and manage memories with a simple REST API.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: 'https://docs.memai.dev',
      },
      {
        property: 'og:site_name',
        content: 'Memai',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Memai - Memory as a Service for AI',
      },
      {
        name: 'twitter:description',
        content: 'Build persistent memory layers for your AI applications.',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
      },
      // Hreflang for i18n SEO
      {
        rel: 'alternate',
        hrefLang: 'en',
        href: 'https://docs.memai.dev/docs',
      },
      {
        rel: 'alternate',
        hrefLang: 'zh',
        href: 'https://docs.memai.dev/zh/docs',
      },
      {
        rel: 'alternate',
        hrefLang: 'x-default',
        href: 'https://docs.memai.dev/docs',
      },
    ],
  }),
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

// UI translations
const translations: Record<string, Record<string, string>> = {
  en: {
    search: 'Search',
    searchNoResult: 'No results found',
    toc: 'On this page',
    tocNoHeading: 'No headings',
    lastUpdate: 'Last updated',
    chooseTheme: 'Choose theme',
    nextPage: 'Next',
    previousPage: 'Previous',
    chooseLanguage: 'Change language',
  },
  zh: {
    search: '搜索文档...',
    searchNoResult: '未找到结果',
    toc: '目录',
    tocNoHeading: '无标题',
    lastUpdate: '最后更新',
    chooseTheme: '选择主题',
    nextPage: '下一页',
    previousPage: '上一页',
    chooseLanguage: '选择语言',
  },
}

function I18nWrapper({ children }: { children: React.ReactNode }) {
  const params = useParams({ strict: false }) as { lang?: string }
  const locale = params.lang || i18n.defaultLanguage

  return (
    <I18nProvider
      locale={locale}
      locales={i18n.languages.map((lang) => ({
        name: lang === 'zh' ? '中文' : 'English',
        locale: lang,
      }))}
      translations={translations[locale]}
    >
      {children}
    </I18nProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const params = useParams({ strict: false }) as { lang?: string }
  const locale = params.lang || i18n.defaultLanguage

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <Providers>
          <I18nWrapper>{children}</I18nWrapper>
        </Providers>
        <Scripts />
      </body>
    </html>
  )
}
