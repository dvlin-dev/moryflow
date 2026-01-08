// src/scraper/__tests__/transformers/readability.extract.spec.ts
/**
 * [TESTS]: Core content extraction functionality
 * [COVERS]: minimalistic pages, noise removal, protected elements, site-specific rules, fallback, error boundaries
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ReadabilityTransformer } from '../../transformers/readability.transformer';

describe('ReadabilityTransformer - extract', () => {
  let transformer: ReadabilityTransformer;

  beforeEach(() => {
    transformer = new ReadabilityTransformer();
  });

  describe('minimalistic pages', () => {
    it('should extract main content from minimalistic landing page', async () => {
      const html = `
        <html>
        <body>
          <nav class="navbar">Menu Link</nav>
          <main id="main">
            <article>
              <h1>Welcome</h1>
              <p>I'm a developer</p>
            </article>
          </main>
          <footer>Copyright 2025</footer>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Welcome');
      expect(result).toContain('developer');
      expect(result.toLowerCase()).not.toContain('copyright');
      expect(result.toLowerCase()).not.toContain('navbar');
    });

    it('should handle pages with very little content', async () => {
      const html = `
        <html>
        <body>
          <header>Site Header</header>
          <main>
            <h1>Hi</h1>
            <p>Short page.</p>
          </main>
          <footer>Footer</footer>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Hi');
      expect(result).toContain('Short page');
    });
  });

  describe('noise removal', () => {
    it('should remove header and footer', async () => {
      const html = `
        <html>
        <body>
          <header>Header Content</header>
          <main><p>Main Content Here</p></main>
          <footer>Footer Content</footer>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Main Content');
      expect(result.toLowerCase()).not.toContain('header content');
      expect(result.toLowerCase()).not.toContain('footer content');
    });

    it('should remove navigation elements', async () => {
      const html = `
        <html>
        <body>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
          <article>
            <h1>Article Title</h1>
            <p>Article content.</p>
          </article>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Article Title');
      expect(result.toLowerCase()).not.toContain('>home<');
      expect(result.toLowerCase()).not.toContain('>about<');
    });

    it('should remove sidebar content', async () => {
      const html = `
        <html>
        <body>
          <aside class="sidebar">
            <h3>Related Posts</h3>
            <ul><li>Other Post</li></ul>
          </aside>
          <main>
            <article><p>Main article content.</p></article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Main article content');
      expect(result.toLowerCase()).not.toContain('related posts');
    });

    it('should remove advertisement elements', async () => {
      const html = `
        <html>
        <body>
          <div class="ad">Buy our product!</div>
          <main>
            <p>Actual content.</p>
          </main>
          <div class="advertisement">Another ad</div>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Actual content');
      expect(result.toLowerCase()).not.toContain('buy our product');
      expect(result.toLowerCase()).not.toContain('another ad');
    });

    it('should remove cookie notices', async () => {
      const html = `
        <html>
        <body>
          <div class="cookie-notice">We use cookies.</div>
          <main>
            <p>Page content.</p>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Page content');
      expect(result.toLowerCase()).not.toContain('we use cookies');
    });
  });

  describe('protected elements', () => {
    it('should preserve main element even if it contains protected content', async () => {
      const html = `
        <html>
        <body>
          <main id="main">
            <article>
              <h1>Protected Content</h1>
              <p>This should be preserved.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Protected Content');
      expect(result).toContain('This should be preserved');
    });

    it('should not remove article element', async () => {
      const html = `
        <html>
        <body>
          <article class="post-content">
            <h1>Article</h1>
            <p>Article body.</p>
          </article>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Article');
      expect(result).toContain('Article body');
    });
  });

  describe('site-specific rules', () => {
    it('should apply Medium extraction rules', async () => {
      const html = `
        <html>
        <body>
          <div class="sidebar">Sidebar content</div>
          <article>
            <h1>Medium Article</h1>
            <p>Article content on Medium.</p>
          </article>
        </body>
        </html>
      `;

      const result = await transformer.extract(
        html,
        'https://medium.com/article',
      );

      expect(result).toContain('Medium Article');
      expect(result.toLowerCase()).not.toContain('sidebar content');
    });

    it('should apply GitHub extraction rules', async () => {
      const html = `
        <html>
        <body>
          <nav>GitHub Nav</nav>
          <div class="markdown-body">
            <h1>README</h1>
            <p>Project description.</p>
          </div>
        </body>
        </html>
      `;

      const result = await transformer.extract(
        html,
        'https://github.com/user/repo',
      );

      expect(result).toContain('README');
      expect(result).toContain('Project description');
    });
  });

  describe('fallback behavior', () => {
    it('should fallback to semantic selectors when Readability fails', async () => {
      const html = `
        <html>
        <body>
          <div class="entry-content">
            <p>Content in entry-content class.</p>
          </div>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Content in entry-content class');
    });

    it('should return cleaned body when all else fails', async () => {
      const html = `
        <html>
        <body>
          <p>Simple paragraph.</p>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('Simple paragraph');
    });
  });

  describe('error boundaries', () => {
    it('should handle invalid URLs gracefully', async () => {
      const html = `
        <html>
        <body>
          <main><p>Content with invalid URL</p></main>
        </body>
        </html>
      `;

      // Should not throw, should return content
      const result = await transformer.extract(html, 'not-a-valid-url');

      expect(result).toContain('Content with invalid URL');
    });

    it('should skip invalid selectors in includeTags', async () => {
      const html = `
        <html>
        <body>
          <main><p>Main content</p></main>
        </body>
        </html>
      `;

      // Invalid selector should be skipped, not throw
      const result = await transformer.extract(html, 'https://example.com/', {
        includeTags: ['[invalid', 'main'],
      });

      expect(result).toContain('Main content');
    });

    it('should skip invalid selectors in excludeTags', async () => {
      const html = `
        <html>
        <body>
          <main><p>Main content</p></main>
        </body>
        </html>
      `;

      // Invalid selector should be skipped, not throw
      const result = await transformer.extract(html, 'https://example.com/', {
        excludeTags: ['[invalid'],
      });

      expect(result).toContain('Main content');
    });
  });
});
