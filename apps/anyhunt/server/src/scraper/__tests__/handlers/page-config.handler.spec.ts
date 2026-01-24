/**
 * PageConfigHandler 单元测试
 * 测试请求头合并与设备预设 UA
 */
import { describe, it, expect, vi } from 'vitest';
import { PageConfigHandler } from '../../handlers/page-config.handler';
import type { ScrapeOptions } from '../../dto/scrape.dto';

describe('PageConfigHandler', () => {
  it('should merge custom headers with device user-agent', async () => {
    const handler = new PageConfigHandler();
    const page = {
      setExtraHTTPHeaders: vi.fn(),
      setViewportSize: vi.fn(),
      emulateMedia: vi.fn(),
    };

    const options: ScrapeOptions = {
      url: 'https://example.com',
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 30000,
      mobile: false,
      darkMode: false,
      sync: false,
      syncTimeout: 120000,
      device: 'mobile',
      headers: {
        Authorization: 'Bearer token',
      },
    };

    await handler.configure(page as any, options);

    expect(page.setExtraHTTPHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        Authorization: 'Bearer token',
        'User-Agent': expect.any(String),
      }),
    );
  });

  it('should not override custom User-Agent header', async () => {
    const handler = new PageConfigHandler();
    const page = {
      setExtraHTTPHeaders: vi.fn(),
      setViewportSize: vi.fn(),
      emulateMedia: vi.fn(),
    };

    const options: ScrapeOptions = {
      url: 'https://example.com',
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 30000,
      mobile: false,
      darkMode: false,
      sync: false,
      syncTimeout: 120000,
      device: 'mobile',
      headers: {
        'User-Agent': 'CustomAgent/1.0',
      },
    };

    await handler.configure(page as any, options);

    expect(page.setExtraHTTPHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        'User-Agent': 'CustomAgent/1.0',
      }),
    );
  });
});
