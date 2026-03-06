/**
 * BrowserPool 单元测试
 *
 * 测试浏览器池的核心功能：
 * - BrowserUnavailableError 错误类型
 *
 * 注意：BrowserPool 类依赖 Playwright，完整测试需要在 e2e 环境中进行
 */

import { describe, it, expect, vi } from 'vitest';
import { BrowserUnavailableError } from '../browser-pool';
import { BrowserPool } from '../browser-pool';
import { STEALTH_CHROMIUM_ARGS } from '../stealth';
import { chromium } from 'playwright';

describe('BrowserUnavailableError', () => {
  it('should create error with correct message format', () => {
    const error = new BrowserUnavailableError('test reason');

    expect(error.message).toBe('Browser unavailable: test reason');
    expect(error.name).toBe('BrowserUnavailableError');
  });

  it('should extend Error', () => {
    const error = new BrowserUnavailableError('test');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BrowserUnavailableError);
  });

  it('should include reason in message', () => {
    const error = new BrowserUnavailableError('pool is shutting down');

    expect(error.message).toContain('pool is shutting down');
  });

  it('should have stack trace', () => {
    const error = new BrowserUnavailableError('test');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('BrowserUnavailableError');
  });
});

describe('BrowserPool exports', () => {
  it('should export BrowserPool class', async () => {
    const { BrowserPool } = await import('../browser-pool');
    expect(BrowserPool).toBeDefined();
  });
});

describe('BrowserPool stealth integration', () => {
  it('appends stealth launch args and applies browser-level CDP stealth', async () => {
    const mockBrowser = {
      on: vi.fn(),
    };
    const launchSpy = vi
      .spyOn(chromium, 'launch')
      .mockResolvedValueOnce(mockBrowser as any);

    const stealthCdp = {
      applyBrowserLevelStealth: vi.fn().mockResolvedValue(undefined),
    };
    const pool = new BrowserPool(
      {
        isAllowed: vi.fn().mockResolvedValue(true),
      } as any,
      stealthCdp as any,
      {
        resolveRegion: vi.fn().mockReturnValue(null),
      } as any,
    );

    await (pool as any).createInstance();

    expect(launchSpy).toHaveBeenCalledTimes(1);
    const launchInput = launchSpy.mock.calls[0]?.[0];
    expect(Array.isArray(launchInput?.args)).toBe(true);
    for (const arg of STEALTH_CHROMIUM_ARGS) {
      expect(launchInput?.args).toContain(arg);
    }
    expect(stealthCdp.applyBrowserLevelStealth).toHaveBeenCalledWith(
      mockBrowser,
    );

    launchSpy.mockRestore();
  });

  it('passes locale and accept-language to page-level stealth', async () => {
    const contextEvents = new Map<string, (...args: unknown[]) => void>();
    const mockContext = {
      addInitScript: vi.fn().mockResolvedValue(undefined),
      on: vi
        .fn()
        .mockImplementation(
          (event: string, handler: (...args: unknown[]) => void) => {
            contextEvents.set(event, handler);
          },
        ),
      route: vi.fn().mockResolvedValue(undefined),
    };
    const mockInstance = {
      pageCount: 0,
      lastUsedAt: 0,
      browser: {
        newContext: vi.fn().mockResolvedValue(mockContext),
      },
    };
    const stealthCdp = {
      applyBrowserLevelStealth: vi.fn().mockResolvedValue(undefined),
      applyPageLevelStealth: vi.fn().mockResolvedValue(undefined),
    };
    const pool = new BrowserPool(
      {
        isAllowed: vi.fn().mockResolvedValue(true),
      } as any,
      stealthCdp as any,
      {
        resolveRegion: vi.fn().mockReturnValue(null),
      } as any,
    );

    await (pool as any).createContextFromInstance(mockInstance, {
      locale: 'ja-JP',
      extraHTTPHeaders: {
        'Accept-Language': 'ja-JP,ja;q=0.9',
      },
      userAgent: 'CustomUA/1.0',
    });

    expect(mockContext.addInitScript).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('"locale":"ja-JP"'),
      }),
    );

    const pageHandler = contextEvents.get('page');
    expect(pageHandler).toBeDefined();
    await pageHandler?.({} as any);

    expect(stealthCdp.applyPageLevelStealth).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        locale: 'ja-JP',
        userAgent: 'CustomUA/1.0',
        acceptLanguage: 'ja-JP,ja;q=0.9',
      }),
    );
  });

  it('derives locale/timezone/accept-language from regionHint', async () => {
    const contextEvents = new Map<string, (...args: unknown[]) => void>();
    const mockContext = {
      addInitScript: vi.fn().mockResolvedValue(undefined),
      on: vi
        .fn()
        .mockImplementation(
          (event: string, handler: (...args: unknown[]) => void) => {
            contextEvents.set(event, handler);
          },
        ),
      route: vi.fn().mockResolvedValue(undefined),
    };
    const newContextSpy = vi.fn().mockResolvedValue(mockContext);
    const mockInstance = {
      pageCount: 0,
      lastUsedAt: 0,
      browser: {
        newContext: newContextSpy,
      },
    };
    const stealthCdp = {
      applyBrowserLevelStealth: vi.fn().mockResolvedValue(undefined),
      applyPageLevelStealth: vi.fn().mockResolvedValue(undefined),
    };
    const stealthRegion = {
      resolveRegion: vi.fn().mockReturnValue({
        locale: 'zh-TW',
        timezone: 'Asia/Taipei',
        acceptLanguage: 'zh-TW,zh;q=0.9,en;q=0.8',
      }),
    };
    const pool = new BrowserPool(
      {
        isAllowed: vi.fn().mockResolvedValue(true),
      } as any,
      stealthCdp as any,
      stealthRegion as any,
    );

    await (pool as any).createContextFromInstance(mockInstance, {
      regionHint: 'https://docs.example.com.tw/page',
    });

    expect(stealthRegion.resolveRegion).toHaveBeenCalledWith(
      'https://docs.example.com.tw/page',
    );
    expect(newContextSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'zh-TW',
        timezoneId: 'Asia/Taipei',
      }),
    );

    const pageHandler = contextEvents.get('page');
    expect(pageHandler).toBeDefined();
    await pageHandler?.({} as any);

    expect(stealthCdp.applyPageLevelStealth).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        locale: 'zh-TW',
        acceptLanguage: 'zh-TW,zh;q=0.9,en;q=0.8',
      }),
    );
  });
});
