/**
 * Digest RSS Service Tests
 *
 * [PROVIDES]: DigestRssService 单元测试
 * [POS]: 测试 RSS/Atom feed 解析逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DigestRssService } from '../../services/rss.service';
import { createMockUrlValidator, type MockUrlValidator } from '../mocks';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DigestRssService', () => {
  let service: DigestRssService;
  let mockUrlValidator: MockUrlValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUrlValidator = createMockUrlValidator();
    service = new DigestRssService(mockUrlValidator as any);
  });

  // ========== fetchAndParse ==========

  describe('fetchAndParse', () => {
    it('should throw error for disallowed URL', async () => {
      mockUrlValidator.isAllowed.mockReturnValue(false);

      await expect(
        service.fetchAndParse({ feedUrl: 'http://localhost/feed.xml' }),
      ).rejects.toThrow('Feed URL not allowed');
    });

    it('should throw error on HTTP failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(
        service.fetchAndParse({ feedUrl: 'https://example.com/feed.xml' }),
      ).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should parse RSS 2.0 feed', async () => {
      const rssXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Test Feed</title>
            <description>Feed description</description>
            <link>https://example.com</link>
            <item>
              <title>Article 1</title>
              <link>https://example.com/article-1</link>
              <description>First article description</description>
              <pubDate>Mon, 01 Jan 2024 10:00:00 GMT</pubDate>
              <author>John Doe</author>
              <category>Tech</category>
              <guid>article-1-guid</guid>
            </item>
            <item>
              <title>Article 2</title>
              <link>https://example.com/article-2</link>
              <description>Second article description</description>
            </item>
          </channel>
        </rss>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(rssXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/feed.xml',
      });

      expect(result.meta.title).toBe('Test Feed');
      expect(result.meta.description).toBe('Feed description');
      expect(result.meta.link).toBe('https://example.com');
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toBe('Article 1');
      expect(result.items[0].url).toBe('https://example.com/article-1');
      expect(result.items[0].description).toBe('First article description');
      expect(result.items[0].author).toBe('John Doe');
      expect(result.items[0].guid).toBe('article-1-guid');
    });

    it('should parse RSS with CDATA sections', async () => {
      const rssXml = `
        <?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title><![CDATA[Test Feed]]></title>
            <item>
              <title><![CDATA[Article with <b>HTML</b>]]></title>
              <link><![CDATA[https://example.com/article]]></link>
              <description><![CDATA[Description with <em>formatting</em>]]></description>
            </item>
          </channel>
        </rss>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(rssXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/feed.xml',
      });

      expect(result.items[0].title).toBe('Article with HTML');
      expect(result.items[0].description).toBe('Description with formatting');
    });

    it('should parse Atom feed', async () => {
      const atomXml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Atom Feed Title</title>
          <subtitle>Feed subtitle</subtitle>
          <entry>
            <title>Entry 1</title>
            <link rel="alternate" href="https://example.com/entry-1"/>
            <summary>Entry summary</summary>
            <published>2024-01-01T10:00:00Z</published>
            <author>
              <name>Jane Doe</name>
            </author>
            <category term="Technology"/>
            <id>entry-1-id</id>
          </entry>
        </feed>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(atomXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/atom.xml',
      });

      expect(result.meta.title).toBe('Atom Feed Title');
      expect(result.meta.description).toBe('Feed subtitle');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Entry 1');
      expect(result.items[0].url).toBe('https://example.com/entry-1');
      expect(result.items[0].description).toBe('Entry summary');
      expect(result.items[0].author).toBe('Jane Doe');
      expect(result.items[0].guid).toBe('entry-1-id');
    });

    it('should use fallback link for Atom entries without rel="alternate"', async () => {
      const atomXml = `
        <?xml version="1.0"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Feed</title>
          <entry>
            <title>Entry</title>
            <link href="https://example.com/fallback"/>
            <id>id</id>
          </entry>
        </feed>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(atomXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/atom.xml',
      });

      expect(result.items[0].url).toBe('https://example.com/fallback');
    });

    it('should respect maxItems limit', async () => {
      const rssXml = `
        <?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item><title>Item 1</title><link>https://example.com/1</link></item>
            <item><title>Item 2</title><link>https://example.com/2</link></item>
            <item><title>Item 3</title><link>https://example.com/3</link></item>
            <item><title>Item 4</title><link>https://example.com/4</link></item>
            <item><title>Item 5</title><link>https://example.com/5</link></item>
          </channel>
        </rss>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(rssXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/feed.xml',
        maxItems: 3,
      });

      expect(result.items).toHaveLength(3);
    });

    it('should skip items without title or URL', async () => {
      const rssXml = `
        <?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item><title></title><link>https://example.com/1</link></item>
            <item><title>Valid Item</title><link>https://example.com/2</link></item>
            <item><title>No Link</title></item>
          </channel>
        </rss>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(rssXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/feed.xml',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Valid Item');
    });

    it('should parse dc:creator as author', async () => {
      const rssXml = `
        <?xml version="1.0"?>
        <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <channel>
            <title>Feed</title>
            <item>
              <title>Article</title>
              <link>https://example.com/article</link>
              <dc:creator>Author Name</dc:creator>
            </item>
          </channel>
        </rss>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(rssXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/feed.xml',
      });

      expect(result.items[0].author).toBe('Author Name');
    });

    it('should parse multiple categories', async () => {
      const rssXml = `
        <?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item>
              <title>Article</title>
              <link>https://example.com/article</link>
              <category>Tech</category>
              <category>AI</category>
              <category>News</category>
            </item>
          </channel>
        </rss>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(rssXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/feed.xml',
      });

      expect(result.items[0].categories).toEqual(['Tech', 'AI', 'News']);
    });

    it('should decode HTML entities', async () => {
      const rssXml = `
        <?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed &amp; News</title>
            <item>
              <title>Article &quot;Title&quot; &lt;test&gt;</title>
              <link>https://example.com/article</link>
            </item>
          </channel>
        </rss>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(rssXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/feed.xml',
      });

      expect(result.meta.title).toBe('Feed & News');
      expect(result.items[0].title).toBe('Article "Title" <test>');
    });

    it('should handle invalid date gracefully', async () => {
      const rssXml = `
        <?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Feed</title>
            <item>
              <title>Article</title>
              <link>https://example.com/article</link>
              <pubDate>invalid-date</pubDate>
            </item>
          </channel>
        </rss>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(rssXml),
      });

      const result = await service.fetchAndParse({
        feedUrl: 'https://example.com/feed.xml',
      });

      expect(result.items[0].pubDate).toBeUndefined();
    });

    it('should set correct headers for fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            '<rss version="2.0"><channel><title>T</title></channel></rss>',
          ),
      });

      await service.fetchAndParse({ feedUrl: 'https://example.com/feed.xml' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/feed.xml',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Aiget-Digest'),
            Accept: expect.stringContaining('application/rss+xml'),
          }),
        }),
      );
    });
  });
});
