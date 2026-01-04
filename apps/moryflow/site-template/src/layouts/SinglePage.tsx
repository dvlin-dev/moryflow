/**
 * [PROPS]: { title, description, content, showWatermark } - 页面配置
 * [POS]: 单页面布局，适用于单个文档发布
 */

import type { ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ThemeToggle, themeToggleScript } from '../components/ThemeToggle';
import { themeScript } from '../scripts/theme';

interface SinglePageProps {
  title?: string;
  description?: string;
  lang?: string;
  content?: ReactNode;
  showWatermark?: boolean;
  styles?: string;
}

export function SinglePage({
  title = '{{title}}',
  description = '{{description}}',
  lang = '{{lang}}',
  content,
  showWatermark = true,
  styles = '{{styles}}',
}: SinglePageProps) {
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="generator" content="Moryflow" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Header title={title}>
            <ThemeToggle />
          </Header>

          <main
            style={{
              flex: 1,
              width: '100%',
              maxWidth: 'var(--content-width)',
              margin: '0 auto',
              padding: 'var(--space-8) var(--space-4)',
            }}
          >
            {content ?? (
              <article
                className="prose"
                dangerouslySetInnerHTML={{ __html: '{{content}}' }}
              />
            )}
          </main>

          <Footer showWatermark={showWatermark} />
        </div>

        <script dangerouslySetInnerHTML={{ __html: themeToggleScript }} />
      </body>
    </html>
  );
}
