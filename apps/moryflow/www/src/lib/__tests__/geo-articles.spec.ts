import { describe, it, expect } from 'vitest';
import { getAllArticles, getArticleBySlug } from '../geo-articles';
import type { GeoFrontmatter } from '../geo-articles';
import { generateBlogPageDefinitions } from '../geo-article-defs';
import { SUPPORTED_LOCALES, type Locale } from '../i18n';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('geo-articles', () => {
  const articles = getAllArticles();

  it('has at least one article registered', () => {
    expect(articles.length).toBeGreaterThan(0);
  });

  it('has unique slugs', () => {
    const slugs = articles.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('slugs are URL-safe kebab-case', () => {
    for (const article of articles) {
      expect(article.slug).toMatch(SLUG_PATTERN);
    }
  });

  it('every article has content for all supported locales', () => {
    for (const article of articles) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(article.content[locale]).toBeDefined();
        expect(article.content[locale].frontmatter).toBeDefined();
        expect(article.content[locale].Component).toBeDefined();
      }
    }
  });

  describe.each(SUPPORTED_LOCALES)('locale %s frontmatter validation', (locale: Locale) => {
    for (const article of articles) {
      const fm: GeoFrontmatter = article.content[locale].frontmatter;
      const label = `${article.slug} [${locale}]`;

      it(`${label}: publishedAt is valid ISO date`, () => {
        expect(fm.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(fm.publishedAt))).toBe(false);
      });

      it(`${label}: title ≤ 60 chars`, () => {
        expect(fm.title.length).toBeLessThanOrEqual(60);
      });

      it(`${label}: description 80-160 chars`, () => {
        expect(fm.description.length).toBeGreaterThanOrEqual(80);
        expect(fm.description.length).toBeLessThanOrEqual(160);
      });

      it(`${label}: has 3-5 key takeaways`, () => {
        expect(fm.keyTakeaways.length).toBeGreaterThanOrEqual(3);
        expect(fm.keyTakeaways.length).toBeLessThanOrEqual(5);
      });

      it(`${label}: has at least 4 FAQs`, () => {
        expect(fm.faqs.length).toBeGreaterThanOrEqual(4);
      });

      it(`${label}: has at least 3 related pages`, () => {
        expect(fm.relatedPages.length).toBeGreaterThanOrEqual(3);
      });

      it(`${label}: related page hrefs start with /`, () => {
        for (const page of fm.relatedPages) {
          expect(page.href).toMatch(/^\//);
        }
      });
    }
  });

  describe('page definitions', () => {
    const defs = generateBlogPageDefinitions();

    it('generates blog index + one def per article', () => {
      expect(defs.length).toBe(articles.length + 1);
    });

    it('blog index has correct shape', () => {
      const blogIndex = defs.find((d) => d.id === 'blog');
      expect(blogIndex).toBeDefined();
      expect(blogIndex!.path).toBe('/blog');
      expect(blogIndex!.kind).toBe('blog');
      expect(blogIndex!.indexable).toBe(true);
    });

    it('article defs have correct paths', () => {
      for (const article of articles) {
        const def = defs.find((d) => d.id === `blog-${article.slug}`);
        expect(def).toBeDefined();
        expect(def!.path).toBe(`/blog/${article.slug}`);
        expect(def!.kind).toBe('blog');
      }
    });
  });

  describe('lookup', () => {
    it('getArticleBySlug returns correct article', () => {
      const first = articles[0]!;
      const found = getArticleBySlug(first.slug);
      expect(found).toBe(first);
    });

    it('getArticleBySlug returns undefined for unknown slug', () => {
      expect(getArticleBySlug('nonexistent-slug-xyz')).toBeUndefined();
    });
  });
});
