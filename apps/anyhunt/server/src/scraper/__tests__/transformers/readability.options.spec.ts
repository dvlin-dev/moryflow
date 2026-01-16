// src/scraper/__tests__/transformers/readability.options.spec.ts
/**
 * [TESTS]: ExtractOptions functionality
 * [COVERS]: includeTags, excludeTags
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ReadabilityTransformer } from '../../transformers/readability.transformer';

describe('ReadabilityTransformer - ExtractOptions', () => {
  let transformer: ReadabilityTransformer;

  beforeEach(() => {
    transformer = new ReadabilityTransformer();
  });

  describe('includeTags', () => {
    it('should filter content by includeTags', async () => {
      const html = `
        <html>
        <body>
          <header>Header Content</header>
          <main class="main-content">
            <p>Main content here.</p>
          </main>
          <aside>Sidebar content</aside>
          <footer>Footer Content</footer>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/', {
        includeTags: ['.main-content'],
      });

      expect(result).toContain('Main content here');
      expect(result.toLowerCase()).not.toContain('header content');
      expect(result.toLowerCase()).not.toContain('sidebar content');
      expect(result.toLowerCase()).not.toContain('footer content');
    });

    it('should include multiple tags', async () => {
      const html = `
        <html>
        <body>
          <header>Header</header>
          <article class="post">Post content</article>
          <div class="comments">Comments section</div>
          <footer>Footer</footer>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/', {
        includeTags: ['.post', '.comments'],
      });

      expect(result).toContain('Post content');
      expect(result).toContain('Comments section');
      expect(result.toLowerCase()).not.toContain('header');
      expect(result.toLowerCase()).not.toContain('footer');
    });
  });

  describe('excludeTags', () => {
    it('should remove elements by excludeTags', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <p>Main article content.</p>
              <div class="author-bio">Author biography here.</div>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/', {
        excludeTags: ['.author-bio'],
      });

      expect(result).toContain('Main article content');
      expect(result.toLowerCase()).not.toContain('author biography');
    });

    it('should prioritize user excludeTags over noise selectors', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <p>Article content.</p>
              <div class="related-posts">Related posts here.</div>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/', {
        excludeTags: ['.related-posts'],
      });

      expect(result).toContain('Article content');
      expect(result.toLowerCase()).not.toContain('related posts');
    });
  });
});
