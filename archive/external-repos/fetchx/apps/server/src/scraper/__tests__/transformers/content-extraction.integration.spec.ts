// src/scraper/__tests__/transformers/content-extraction.integration.spec.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { ReadabilityTransformer } from '../../transformers/readability.transformer';
import { MarkdownTransformer } from '../../transformers/markdown.transformer';
import {
  allFixtures,
  assertContentMatches,
  type ContentFixture,
} from '../../../../test/fixtures/content-extraction';

describe('Content Extraction Integration', () => {
  let readabilityTransformer: ReadabilityTransformer;
  let markdownTransformer: MarkdownTransformer;

  beforeAll(() => {
    readabilityTransformer = new ReadabilityTransformer();
    markdownTransformer = new MarkdownTransformer();
  });

  describe.each(allFixtures)('$id fixture', (fixture: ContentFixture) => {
    it(`should extract expected content from ${fixture.id}`, async () => {
      const extracted = await readabilityTransformer.extract(
        fixture.html,
        fixture.url,
      );

      const result = assertContentMatches(extracted, fixture.expected);

      if (!result.success) {
        console.error(`Fixture ${fixture.id} failed:`, result.errors);
      }

      expect(result.success).toBe(true);
    });

    it(`should exclude noise content from ${fixture.id}`, async () => {
      const extracted = await readabilityTransformer.extract(
        fixture.html,
        fixture.url,
      );

      for (const noise of fixture.expected.mustNotContain) {
        expect(extracted.toLowerCase()).not.toContain(noise.toLowerCase());
      }
    });

    it(`should respect content length bounds for ${fixture.id}`, async () => {
      const extracted = await readabilityTransformer.extract(
        fixture.html,
        fixture.url,
      );

      expect(extracted.length).toBeGreaterThanOrEqual(
        fixture.expected.minLength,
      );
      expect(extracted.length).toBeLessThanOrEqual(fixture.expected.maxLength);
    });

    it(`should produce valid markdown for ${fixture.id}`, async () => {
      const extracted = await readabilityTransformer.extract(
        fixture.html,
        fixture.url,
      );

      const markdown = await markdownTransformer.convert(extracted, {
        baseUrl: fixture.url,
      });

      // Markdown should not be empty
      expect(markdown.length).toBeGreaterThan(0);

      // Should not contain script/style tags
      expect(markdown).not.toMatch(/<script|<style|<nav|<footer/i);
    });
  });

  describe('regression tests', () => {
    it('should handle empty body gracefully', async () => {
      const html = '<html><body></body></html>';
      const result = await readabilityTransformer.extract(
        html,
        'https://example.com/',
      );

      expect(result).toBe('');
    });

    it('should handle body with only scripts', async () => {
      const html = `
        <html>
        <body>
          <script>console.log("test")</script>
          <style>.test { color: red; }</style>
        </body>
        </html>
      `;

      const result = await readabilityTransformer.extract(
        html,
        'https://example.com/',
      );

      expect(result).not.toContain('console.log');
      expect(result).not.toContain('color: red');
    });

    it('should preserve code blocks in technical content', async () => {
      const html = `
        <html>
        <body>
          <article>
            <h1>Code Example</h1>
            <pre><code class="language-js">const x = 1;</code></pre>
          </article>
        </body>
        </html>
      `;

      const result = await readabilityTransformer.extract(
        html,
        'https://example.com/',
      );

      expect(result).toContain('const x = 1');
    });

    it('should handle nested main/article structure', async () => {
      const html = `
        <html>
        <body>
          <main>
            <article>
              <section>
                <p>Nested content.</p>
              </section>
            </article>
          </main>
        </body>
        </html>
      `;

      const result = await readabilityTransformer.extract(
        html,
        'https://example.com/',
      );

      expect(result).toContain('Nested content');
    });
  });

  describe('content quality metrics', () => {
    it('should maintain content-to-noise ratio above threshold', async () => {
      for (const fixture of allFixtures) {
        if (!fixture.metadata.hasNavigation && !fixture.metadata.hasFooter) {
          continue;
        }

        const extracted = await readabilityTransformer.extract(
          fixture.html,
          fixture.url,
        );

        // Extracted content should be significantly smaller than raw HTML
        // (indicating noise was removed)
        const ratio = extracted.length / fixture.html.length;

        expect(ratio).toBeLessThan(0.8);
      }
    });
  });
});
