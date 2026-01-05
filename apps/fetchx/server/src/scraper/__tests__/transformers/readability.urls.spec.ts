// src/scraper/__tests__/transformers/readability.urls.spec.ts
/**
 * [TESTS]: URL processing functionality
 * [COVERS]: srcset optimization, URL absolutization, baseUrl option
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ReadabilityTransformer } from '../../transformers/readability.transformer';

describe('ReadabilityTransformer - URL processing', () => {
  let transformer: ReadabilityTransformer;

  beforeEach(() => {
    transformer = new ReadabilityTransformer();
  });

  describe('srcset optimization', () => {
    it('should optimize srcset images and select largest', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <img srcset="/small.jpg 100w, /medium.jpg 500w, /large.jpg 1000w" src="/small.jpg" alt="Test">
              <p>Content with image.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(
        html,
        'https://example.com/page/',
      );

      expect(result).toContain('Content with image');
      // Should use the largest image (1000w) in src attribute
      expect(result).toMatch(/src="https:\/\/example\.com\/large\.jpg"/);
    });

    it('should handle srcset with x descriptors', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <img srcset="/img-1x.jpg 1x, /img-2x.jpg 2x, /img-3x.jpg 3x" src="/img-1x.jpg" alt="Test">
              <p>Content.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(
        html,
        'https://example.com/page/',
      );

      // Should use the highest resolution (3x)
      expect(result).toContain('https://example.com/img-3x.jpg');
    });
  });

  describe('URL absolutization', () => {
    it('should convert relative image URLs to absolute', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <img src="/images/photo.jpg" alt="Photo">
              <img src="relative/image.png" alt="Relative">
              <p>Images above.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(
        html,
        'https://example.com/blog/post/',
      );

      expect(result).toContain('https://example.com/images/photo.jpg');
      expect(result).toContain(
        'https://example.com/blog/post/relative/image.png',
      );
    });

    it('should convert relative link URLs to absolute', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <p>Check out <a href="/about">about page</a> and <a href="contact">contact</a>.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(
        html,
        'https://example.com/blog/',
      );

      expect(result).toContain('href="https://example.com/about"');
      expect(result).toContain('href="https://example.com/blog/contact"');
    });

    it('should preserve absolute URLs', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <img src="https://cdn.example.com/image.jpg" alt="CDN">
              <a href="https://external.com/link">External link</a>
              <p>Content.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('https://cdn.example.com/image.jpg');
      expect(result).toContain('https://external.com/link');
    });

    it('should preserve special URLs (mailto, tel, anchors)', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <a href="mailto:test@example.com">Email</a>
              <a href="tel:+1234567890">Phone</a>
              <a href="#section">Anchor</a>
              <p>Links above.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('mailto:test@example.com');
      expect(result).toContain('tel:+1234567890');
      expect(result).toContain('#section');
    });

    it('should preserve data URLs', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <img src="data:image/png;base64,ABC123" alt="Data URL">
              <p>Image above.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/');

      expect(result).toContain('data:image/png;base64,ABC123');
    });
  });

  describe('baseUrl option', () => {
    it('should use custom baseUrl for URL resolution', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <img src="/images/photo.jpg" alt="Photo">
              <p>Image above.</p>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await transformer.extract(html, 'https://example.com/', {
        baseUrl: 'https://cdn.example.com/',
      });

      expect(result).toContain('https://cdn.example.com/images/photo.jpg');
    });
  });
});
