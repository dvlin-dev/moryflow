/**
 * UrlValidator 单元测试
 * 测试 SSRF 防护逻辑
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import type { UrlValidator } from '../validators/url.validator';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(),
}));

const PUBLIC_IP = '93.184.216.34';
const lookupMock = vi.mocked(lookup);

const resolveHost = (hostname: string): string[] => {
  const host = hostname.toLowerCase();

  if (isIP(host)) {
    return [host];
  }

  if (host === 'metadata.google.internal') return ['169.254.169.254'];
  if (host === 'localhost') return ['127.0.0.1'];
  if (host === '2130706433' || host === '0x7f000001') return ['127.0.0.1'];
  if (host === 'example.com') return [PUBLIC_IP];
  if (host === 'example-with-dash.com') return [PUBLIC_IP];
  if (host === 'sub.example.com') return [PUBLIC_IP];
  if (host === 'deep.sub.example.com') return [PUBLIC_IP];
  if (host === '123.example.com') return [PUBLIC_IP];
  if (host === 'www.google.com') return ['142.250.72.4'];
  if (host === 'api.github.com') return ['140.82.113.5'];

  return [];
};

describe('UrlValidator', () => {
  let validator: UrlValidator;

  beforeEach(async () => {
    lookupMock.mockImplementation((async (
      hostname: string,
      options?: { all?: boolean },
    ) => {
      const addresses = resolveHost(String(hostname));
      const results = addresses.map((address) => ({
        address,
        family: address.includes(':') ? 6 : 4,
      }));

      if (
        options &&
        typeof options === 'object' &&
        'all' in options &&
        options.all
      ) {
        return results;
      }

      return results[0];
    }) as typeof lookup);
    vi.resetModules();
    const { UrlValidator } = await import('../validators/url.validator');
    validator = new UrlValidator();
  });

  describe('isAllowed', () => {
    // ============ 允许的 URL ============

    describe('allowed URLs', () => {
      it.each([
        'https://example.com',
        'https://example.com/path',
        'https://example.com/path?query=1',
        'https://example.com:8080/path',
        'http://example.com',
        'https://sub.example.com',
        'https://deep.sub.example.com',
        'https://example-with-dash.com',
        'https://123.example.com',
        'https://www.google.com',
        'https://api.github.com/users',
        'https://[2606:4700:4700::1111]',
      ])('should allow valid public URL: %s', async (url) => {
        await expect(validator.isAllowed(url)).resolves.toBe(true);
      });
    });

    // ============ 私有 IP 地址 ============

    describe('private IP addresses (SSRF protection)', () => {
      describe('localhost (127.x.x.x)', () => {
        it.each([
          'http://127.0.0.1',
          'http://127.0.0.1:8080',
          'http://127.0.0.1/path',
          'http://127.1.2.3',
          'http://127.255.255.255',
          'https://127.0.0.1',
        ])('should block localhost IP: %s', async (url) => {
          await expect(validator.isAllowed(url)).resolves.toBe(false);
        });
      });

      describe('10.x.x.x (Class A private)', () => {
        it.each([
          'http://10.0.0.1',
          'http://10.0.0.1:3000',
          'http://10.255.255.255',
          'http://10.10.10.10',
        ])('should block 10.x.x.x: %s', async (url) => {
          await expect(validator.isAllowed(url)).resolves.toBe(false);
        });
      });

      describe('172.16.x.x - 172.31.x.x (Class B private)', () => {
        it.each([
          'http://172.16.0.1',
          'http://172.16.0.1:8080',
          'http://172.20.0.1',
          'http://172.31.255.255',
        ])('should block 172.16-31.x.x: %s', async (url) => {
          await expect(validator.isAllowed(url)).resolves.toBe(false);
        });

        it.each(['http://172.15.0.1', 'http://172.32.0.1'])(
          'should allow non-private 172.x.x.x: %s',
          async (url) => {
            await expect(validator.isAllowed(url)).resolves.toBe(true);
          },
        );
      });

      describe('192.168.x.x (Class C private)', () => {
        it.each([
          'http://192.168.0.1',
          'http://192.168.0.1:80',
          'http://192.168.1.1',
          'http://192.168.255.255',
        ])('should block 192.168.x.x: %s', async (url) => {
          await expect(validator.isAllowed(url)).resolves.toBe(false);
        });

        it('should allow non-private 192.x.x.x', async () => {
          await expect(validator.isAllowed('http://192.167.0.1')).resolves.toBe(
            true,
          );
          await expect(validator.isAllowed('http://192.169.0.1')).resolves.toBe(
            true,
          );
        });
      });

      describe('0.x.x.x', () => {
        it.each(['http://0.0.0.0', 'http://0.0.0.0:8080'])(
          'should block 0.x.x.x: %s',
          async (url) => {
            await expect(validator.isAllowed(url)).resolves.toBe(false);
          },
        );
      });

      describe('link-local (169.254.x.x)', () => {
        it.each([
          'http://169.254.0.1',
          'http://169.254.169.254',
          'http://169.254.255.255',
        ])('should block link-local: %s', async (url) => {
          await expect(validator.isAllowed(url)).resolves.toBe(false);
        });
      });

      describe('IPv6 ranges', () => {
        it.each(['http://[::1]', 'http://[fe80::1]'])(
          'should block IPv6 local ranges: %s',
          async (url) => {
            await expect(validator.isAllowed(url)).resolves.toBe(false);
          },
        );
      });
    });

    // ============ 特殊域名 ============

    describe('special domains', () => {
      it.each([
        'http://localhost',
        'http://localhost:3000',
        'http://localhost:8080/api',
        'https://localhost',
      ])('should block localhost domain: %s', async (url) => {
        await expect(validator.isAllowed(url)).resolves.toBe(false);
      });

      it.each([
        'http://metadata.google.internal',
        'https://metadata.google.internal/computeMetadata/v1/',
      ])('should block cloud metadata service: %s', async (url) => {
        await expect(validator.isAllowed(url)).resolves.toBe(false);
      });

      it.each([
        'http://foo.local',
        'https://bar.internal',
        'https://sub.localhost',
      ])('should block local domain suffix: %s', async (url) => {
        await expect(validator.isAllowed(url)).resolves.toBe(false);
      });
    });

    // ============ 无效协议 ============

    describe('invalid protocols', () => {
      it.each([
        'file:///etc/passwd',
        'file://localhost/etc/passwd',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'ftp://example.com',
        'sftp://example.com',
        'ssh://example.com',
        'telnet://example.com',
        'gopher://example.com',
      ])('should block invalid protocol: %s', async (url) => {
        await expect(validator.isAllowed(url)).resolves.toBe(false);
      });
    });

    // ============ 无效 URL ============

    describe('invalid URLs', () => {
      it.each([
        '',
        'not-a-url',
        'http://',
        'https://',
        '://example.com',
        'example.com',
        '//example.com',
      ])('should return false for invalid URL: %s', async (url) => {
        await expect(validator.isAllowed(url)).resolves.toBe(false);
      });
    });

    // ============ Edge cases ============

    describe('edge cases', () => {
      it('should block URL with credentials', async () => {
        await expect(
          validator.isAllowed('http://user:pass@example.com'),
        ).resolves.toBe(false);
        await expect(
          validator.isAllowed('http://user:pass@localhost'),
        ).resolves.toBe(false);
      });

      it('should handle URL with fragment', async () => {
        await expect(
          validator.isAllowed('https://example.com#section'),
        ).resolves.toBe(true);
      });

      it('should handle URL with unicode', async () => {
        await expect(
          validator.isAllowed('https://example.com/path?q=中文'),
        ).resolves.toBe(true);
      });

      it('should handle very long URLs', async () => {
        const longPath = 'a'.repeat(1000);
        await expect(
          validator.isAllowed(`https://example.com/${longPath}`),
        ).resolves.toBe(true);
      });

      it('should be case insensitive for protocols', async () => {
        await expect(validator.isAllowed('HTTP://example.com')).resolves.toBe(
          true,
        );
        await expect(validator.isAllowed('HTTPS://example.com')).resolves.toBe(
          true,
        );
      });

      it('should be case insensitive for domains', async () => {
        await expect(validator.isAllowed('https://EXAMPLE.COM')).resolves.toBe(
          true,
        );
        await expect(validator.isAllowed('http://LOCALHOST')).resolves.toBe(
          false,
        );
      });

      it('should block unresolved host', async () => {
        await expect(
          validator.isAllowed('https://missing.example.invalid'),
        ).resolves.toBe(false);
      });
    });
  });
});
