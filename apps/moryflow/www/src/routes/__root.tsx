import { createRootRoute, HeadContent, Outlet, Scripts, useMatch } from '@tanstack/react-router';
import { JsonLd, organizationSchema } from '@/components/seo/JsonLd';
import { Header, Footer } from '@/components/layout';
import { LOCALE_HTML_LANG, DEFAULT_LOCALE, isValidLocale } from '@/lib/i18n';
import '@/styles/globals.css';

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#FF9F1C' },
      { name: 'format-detection', content: 'telephone=no' },
    ],
    links: [
      // Basic links
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },

      // Preconnect: establish early connections to third-party domains
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },

      // DNS prefetch: resolve domain names that may be used
      { rel: 'dns-prefetch', href: 'https://server.moryflow.com' },

      // Preload critical resources: Logo (visible above the fold)
      { rel: 'preload', href: '/logo.svg', as: 'image', type: 'image/svg+xml' },
    ],
  }),
});

function RootComponent() {
  // Extract locale from route params for dynamic html lang
  const match = useMatch({ from: '/{-$locale}', shouldThrow: false });
  const rawLocale = (match?.params as { locale?: string } | undefined)?.locale;
  const locale = rawLocale && isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const htmlLang = LOCALE_HTML_LANG[locale];

  return (
    <html lang={htmlLang}>
      <head>
        <HeadContent />
        <JsonLd data={organizationSchema} />
      </head>
      <body className="bg-mory-bg text-mory-text-primary antialiased">
        <Header />
        <Outlet />
        <Footer />
        <Scripts />
      </body>
    </html>
  );
}
