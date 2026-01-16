/**
 * URL Utils Tests
 *
 * [PROVIDES]: URL 工具函数测试
 * [POS]: 测试 URL 规范化和哈希计算
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalizeUrl,
  computeUrlHash,
  extractDomain,
  isSameContent,
  computeUrlHashes,
} from '../../utils/url.utils';

describe('URL Utils', () => {
  // ========== canonicalizeUrl ==========

  describe('canonicalizeUrl', () => {
    describe('HTTPS normalization', () => {
      it('should convert HTTP to HTTPS', () => {
        const result = canonicalizeUrl('http://example.com/page');

        expect(result).toBe('https://example.com/page');
      });

      it('should keep HTTPS as is', () => {
        const result = canonicalizeUrl('https://example.com/page');

        expect(result).toBe('https://example.com/page');
      });
    });

    describe('domain normalization', () => {
      it('should remove www prefix', () => {
        const result = canonicalizeUrl('https://www.example.com/page');

        expect(result).toBe('https://example.com/page');
      });

      it('should lowercase domain', () => {
        const result = canonicalizeUrl('https://EXAMPLE.COM/Page');

        expect(result.startsWith('https://example.com/')).toBe(true);
      });

      it.each([
        [
          'https://www.youtube.com/watch?v=abc123',
          'https://youtube.com/watch?v=abc123',
        ],
        [
          'https://m.youtube.com/watch?v=abc123',
          'https://youtube.com/watch?v=abc123',
        ],
        ['https://youtu.be/abc123', 'https://youtube.com/watch?v=abc123'],
        ['https://www.twitter.com/user', 'https://twitter.com/user'],
        ['https://x.com/user', 'https://twitter.com/user'],
        ['https://www.x.com/user', 'https://twitter.com/user'],
        ['https://mobile.twitter.com/user', 'https://twitter.com/user'],
        ['https://www.github.com/repo', 'https://github.com/repo'],
        ['https://old.reddit.com/r/sub', 'https://reddit.com/r/sub'],
        ['https://new.reddit.com/r/sub', 'https://reddit.com/r/sub'],
        ['https://m.reddit.com/r/sub', 'https://reddit.com/r/sub'],
        ['https://www.medium.com/article', 'https://medium.com/article'],
        ['https://m.facebook.com/page', 'https://facebook.com/page'],
        ['https://m.instagram.com/profile', 'https://instagram.com/profile'],
      ])('should normalize %s to %s', (input, expected) => {
        expect(canonicalizeUrl(input)).toBe(expected);
      });
    });

    describe('tracking parameter removal', () => {
      it('should remove UTM parameters', () => {
        const result = canonicalizeUrl(
          'https://example.com/page?utm_source=twitter&utm_medium=social&utm_campaign=test',
        );

        expect(result).toBe('https://example.com/page');
      });

      it('should remove Facebook click ID', () => {
        const result = canonicalizeUrl(
          'https://example.com/page?fbclid=abc123',
        );

        expect(result).toBe('https://example.com/page');
      });

      it('should remove Google click ID', () => {
        const result = canonicalizeUrl(
          'https://example.com/page?gclid=abc123&gclsrc=aw.ds',
        );

        expect(result).toBe('https://example.com/page');
      });

      it('should keep non-tracking parameters', () => {
        const result = canonicalizeUrl(
          'https://example.com/search?q=test&page=1',
        );

        expect(result).toContain('q=test');
        expect(result).toContain('page=1');
      });

      it('should remove multiple tracking parameters while keeping others', () => {
        const result = canonicalizeUrl(
          'https://example.com/page?id=123&utm_source=twitter&ref=home',
        );

        expect(result).toContain('id=123');
        expect(result).not.toContain('utm_source');
        expect(result).not.toContain('ref=');
      });

      it.each([
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'fbclid',
        'gclid',
        'gclsrc',
        'dclid',
        'msclkid',
        'twclid',
        'ttclid',
        'epik',
        'mc_cid',
        'mc_eid',
        '_hsenc',
        '_hsmi',
        '__hstc',
        '__hsfp',
        'mkt_tok',
        's_kwcid',
        'cid',
        'ref',
        'source',
        'src',
        'via',
        'trk',
        'tracking',
        '_ga',
        '_gl',
      ])('should remove tracking param: %s', (param) => {
        const result = canonicalizeUrl(
          `https://example.com/page?${param}=value`,
        );

        expect(result).toBe('https://example.com/page');
      });
    });

    describe('fragment removal', () => {
      it('should remove URL fragments', () => {
        const result = canonicalizeUrl('https://example.com/page#section');

        expect(result).toBe('https://example.com/page');
      });

      it('should remove complex fragments', () => {
        const result = canonicalizeUrl('https://example.com/page?q=test#top');

        expect(result).toBe('https://example.com/page?q=test');
      });
    });

    describe('path normalization', () => {
      it('should remove trailing slash', () => {
        const result = canonicalizeUrl('https://example.com/page/');

        expect(result).toBe('https://example.com/page');
      });

      it('should keep root path slash', () => {
        const result = canonicalizeUrl('https://example.com/');

        expect(result).toBe('https://example.com/');
      });

      it('should remove duplicate slashes', () => {
        const result = canonicalizeUrl('https://example.com//page//subpage');

        expect(result).toBe('https://example.com/page/subpage');
      });
    });

    describe('YouTube special handling', () => {
      it('should normalize youtu.be short URLs', () => {
        const result = canonicalizeUrl('https://youtu.be/dQw4w9WgXcQ');

        expect(result).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
      });

      it('should normalize YouTube embed URLs', () => {
        const result = canonicalizeUrl(
          'https://www.youtube.com/embed/dQw4w9WgXcQ',
        );

        expect(result).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
      });

      it('should normalize YouTube /v/ URLs', () => {
        const result = canonicalizeUrl('https://www.youtube.com/v/dQw4w9WgXcQ');

        expect(result).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
      });

      it('should keep standard YouTube watch URLs', () => {
        const result = canonicalizeUrl(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        );

        expect(result).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
      });

      it('should strip tracking params from YouTube URLs', () => {
        const result = canonicalizeUrl(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=share&feature=share',
        );

        expect(result).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ');
      });
    });

    describe('error handling', () => {
      it('should return original URL for invalid URLs', () => {
        const invalid = 'not-a-valid-url';
        const result = canonicalizeUrl(invalid);

        expect(result).toBe(invalid);
      });

      it('should handle empty string', () => {
        const result = canonicalizeUrl('');

        expect(result).toBe('');
      });
    });
  });

  // ========== computeUrlHash ==========

  describe('computeUrlHash', () => {
    it('should return SHA256 hash', () => {
      const result = computeUrlHash('https://example.com/page');

      expect(result).toHaveLength(64); // SHA256 hex = 64 chars
      expect(/^[a-f0-9]+$/.test(result)).toBe(true);
    });

    it('should return consistent hash for same URL', () => {
      const url = 'https://example.com/page';

      const hash1 = computeUrlHash(url);
      const hash2 = computeUrlHash(url);

      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different URLs', () => {
      const hash1 = computeUrlHash('https://example.com/page1');
      const hash2 = computeUrlHash('https://example.com/page2');

      expect(hash1).not.toBe(hash2);
    });

    it('should be case-sensitive', () => {
      const hash1 = computeUrlHash('https://example.com/Page');
      const hash2 = computeUrlHash('https://example.com/page');

      expect(hash1).not.toBe(hash2);
    });
  });

  // ========== extractDomain ==========

  describe('extractDomain', () => {
    it('should extract domain without www', () => {
      const result = extractDomain('https://www.example.com/page');

      expect(result).toBe('example.com');
    });

    it('should extract domain when no www', () => {
      const result = extractDomain('https://example.com/page');

      expect(result).toBe('example.com');
    });

    it('should lowercase domain', () => {
      const result = extractDomain('https://EXAMPLE.COM/page');

      expect(result).toBe('example.com');
    });

    it('should handle subdomains', () => {
      const result = extractDomain('https://blog.example.com/page');

      expect(result).toBe('blog.example.com');
    });

    it('should handle only www subdomain', () => {
      const result = extractDomain('https://www.blog.example.com/page');

      expect(result).toBe('blog.example.com');
    });

    it('should return empty string for invalid URLs', () => {
      const result = extractDomain('not-a-url');

      expect(result).toBe('');
    });

    it('should return empty string for empty string', () => {
      const result = extractDomain('');

      expect(result).toBe('');
    });

    it('should handle URLs with ports', () => {
      const result = extractDomain('https://example.com:8080/page');

      expect(result).toBe('example.com');
    });
  });

  // ========== isSameContent ==========

  describe('isSameContent', () => {
    it('should return true for identical URLs', () => {
      const result = isSameContent(
        'https://example.com/page',
        'https://example.com/page',
      );

      expect(result).toBe(true);
    });

    it('should return true for URLs that normalize to same', () => {
      const result = isSameContent(
        'http://www.example.com/page/',
        'https://example.com/page',
      );

      expect(result).toBe(true);
    });

    it('should return true for URLs with different tracking params', () => {
      const result = isSameContent(
        'https://example.com/page?utm_source=twitter',
        'https://example.com/page?utm_source=facebook',
      );

      expect(result).toBe(true);
    });

    it('should return true for different YouTube URL formats', () => {
      const result = isSameContent(
        'https://youtu.be/abc123',
        'https://www.youtube.com/watch?v=abc123',
      );

      expect(result).toBe(true);
    });

    it('should return false for different pages', () => {
      const result = isSameContent(
        'https://example.com/page1',
        'https://example.com/page2',
      );

      expect(result).toBe(false);
    });

    it('should return false for different domains', () => {
      const result = isSameContent(
        'https://example.com/page',
        'https://other.com/page',
      );

      expect(result).toBe(false);
    });

    it('should return false for URLs with different non-tracking params', () => {
      const result = isSameContent(
        'https://example.com/page?id=1',
        'https://example.com/page?id=2',
      );

      expect(result).toBe(false);
    });
  });

  // ========== computeUrlHashes ==========

  describe('computeUrlHashes', () => {
    it('should compute hashes for multiple URLs', () => {
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://other.com/page',
      ];

      const result = computeUrlHashes(urls);

      expect(result.size).toBe(3);
      expect(result.has('https://example.com/page1')).toBe(true);
      expect(result.has('https://example.com/page2')).toBe(true);
      expect(result.has('https://other.com/page')).toBe(true);
    });

    it('should return Map with original URL as key', () => {
      const url = 'http://www.example.com/page/';
      const result = computeUrlHashes([url]);

      expect(result.has(url)).toBe(true);
    });

    it('should compute canonical hash (not original URL hash)', () => {
      // 两个 URL 规范化后相同
      const url1 = 'http://www.example.com/page/';
      const url2 = 'https://example.com/page';

      const result = computeUrlHashes([url1, url2]);

      // 两个原始 URL 作为 key
      expect(result.size).toBe(2);

      // 但是它们的 hash 值应该相同（因为规范化后相同）
      expect(result.get(url1)).toBe(result.get(url2));
    });

    it('should handle empty array', () => {
      const result = computeUrlHashes([]);

      expect(result.size).toBe(0);
    });

    it('should handle duplicate URLs', () => {
      const urls = ['https://example.com/page', 'https://example.com/page'];

      const result = computeUrlHashes(urls);

      // Map 会覆盖重复的 key
      expect(result.size).toBe(1);
    });
  });
});
