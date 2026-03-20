import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useMatch,
  useLocation,
} from '@tanstack/react-router';
import { JsonLd, organizationSchema } from '@/components/seo/JsonLd';
import { Header, Footer } from '@/components/layout';
import { LocaleProvider } from '@/lib/locale-context';
import { LOCALE_HTML_LANG, DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n';
import '@/styles/globals.css';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#455DD3' },
      { name: 'format-detection', content: 'telephone=no' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },

      // Inter font — preconnect + preload (non-render-blocking)
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        as: 'style',
      },

      { rel: 'dns-prefetch', href: 'https://server.moryflow.com' },
      { rel: 'preload', href: '/logo.svg', as: 'image', type: 'image/svg+xml' },
      // Preload LCP hero image — mobile size for faster discovery
      {
        rel: 'preload',
        href: '/home-all-dark-640w.avif',
        as: 'image',
        type: 'image/avif',
      },
    ],
  }),
});

function NotFoundPage() {
  const { pathname } = useLocation();
  const localePrefix = pathname.startsWith('/zh') ? '/zh' : '/';

  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-extrabold text-foreground mb-4">404</h1>
      <p className="text-lg text-secondary mb-8">The page you're looking for doesn't exist.</p>
      <a href={localePrefix} className="text-brand hover:text-brand-light font-medium">
        Back to home
      </a>
    </main>
  );
}

function RootComponent() {
  const match = useMatch({ from: '/{-$locale}', shouldThrow: false });
  const rawLocale = (match?.params as { locale?: string } | undefined)?.locale;
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const htmlLang = LOCALE_HTML_LANG[locale];

  return (
    <html lang={htmlLang}>
      <head>
        <HeadContent />
        <JsonLd data={organizationSchema} />
        {/* Async Google Fonts — avoids render-blocking stylesheet */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";document.head.appendChild(l)})()`,
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          />
        </noscript>
      </head>
      <body className="bg-background text-foreground antialiased">
        <LocaleProvider locale={locale}>
          <Header />
          <Outlet />
          <Footer />
        </LocaleProvider>
        <Scripts />
      </body>
    </html>
  );
}
