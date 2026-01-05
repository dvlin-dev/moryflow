/**
 * [PROPS]: { title, description, content, navigation, toc, showWatermark } - 页面配置
 * [POS]: 多页面布局，适用于多文档发布，带侧边导航
 */

import type { ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ThemeToggle, themeToggleScript } from '../components/ThemeToggle';
import { Navigation, type NavItem } from '../components/Navigation';
import { TableOfContents, type TocItem, tocScript } from '../components/TableOfContents';
import { MobileNav, mobileNavScript } from '../components/MobileNav';
import { themeScript } from '../scripts/theme';

interface MultiPageProps {
  title?: string;
  description?: string;
  lang?: string;
  content?: ReactNode;
  navigation?: NavItem[];
  toc?: TocItem[];
  currentPath?: string;
  showWatermark?: boolean;
  styles?: string;
}

export function MultiPage({
  title = '{{title}}',
  description = '{{description}}',
  lang = '{{lang}}',
  content,
  navigation = [],
  toc = [],
  currentPath = '',
  showWatermark = true,
  styles = '{{styles}}',
}: MultiPageProps) {
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
        <style dangerouslySetInnerHTML={{ __html: multiPageStyles }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="layout-multi">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-header">
              <a href="/" className="sidebar-title">{title}</a>
            </div>
            <Navigation items={navigation} currentPath={currentPath} />
          </aside>

          {/* Main content area */}
          <div className="main-area">
            <Header>
              <MobileNav items={navigation} />
              <ThemeToggle />
            </Header>

            <div className="content-wrapper">
              <main className="content">
                {content ?? (
                  <article
                    className="prose"
                    dangerouslySetInnerHTML={{ __html: '{{content}}' }}
                  />
                )}
              </main>

              {toc.length > 0 && (
                <aside className="toc" data-toc>
                  <TableOfContents items={toc} />
                </aside>
              )}
            </div>

            <Footer showWatermark={showWatermark} />
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: themeToggleScript }} />
        <script dangerouslySetInnerHTML={{ __html: mobileNavScript }} />
        <script dangerouslySetInnerHTML={{ __html: tocScript }} />
      </body>
    </html>
  );
}

const multiPageStyles = `
.layout-multi {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  z-index: 50;
}

.sidebar-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.sidebar-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  text-decoration: none;
}

.main-area {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-wrapper {
  flex: 1;
  display: flex;
  max-width: calc(var(--content-width-wide) + var(--toc-width) + var(--space-8));
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  gap: var(--space-8);
  width: 100%;
}

.content {
  flex: 1;
  min-width: 0;
  max-width: var(--content-width-wide);
}

.toc {
  width: var(--toc-width);
  flex-shrink: 0;
}

/* Responsive: hide sidebar on mobile */
@media (max-width: 1023px) {
  .sidebar {
    display: none;
  }

  .main-area {
    margin-left: 0;
  }

  .toc {
    display: none;
  }
}

/* Responsive: hide TOC on medium screens */
@media (max-width: 1279px) {
  .toc {
    display: none;
  }
}
`;
