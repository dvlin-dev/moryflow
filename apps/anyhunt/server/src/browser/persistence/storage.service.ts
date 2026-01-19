/**
 * Storage Persistence Service
 *
 * [INPUT]: 会话存储导出/导入请求
 * [OUTPUT]: Cookies、localStorage、sessionStorage 数据
 * [POS]: 管理浏览器会话状态持久化，支持断点续传
 */

import { Injectable, Logger } from '@nestjs/common';
import type { BrowserContext, Page } from 'playwright';
import type {
  ExportStorageInput,
  ImportStorageInput,
  StorageExportResult,
} from '../dto';

/** Cookie 数据 */
interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

/** 存储导入失败错误 */
export class StorageImportError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'StorageImportError';
  }
}

/** 存储导出失败错误 */
export class StorageExportError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'StorageExportError';
  }
}

@Injectable()
export class StoragePersistenceService {
  private readonly logger = new Logger(StoragePersistenceService.name);

  /**
   * 导出会话存储
   */
  async exportStorage(
    context: BrowserContext,
    page: Page,
    options?: ExportStorageInput,
  ): Promise<StorageExportResult> {
    const include = options?.include ?? {
      cookies: true,
      localStorage: true,
      sessionStorage: false,
    };
    const domains = options?.domains;

    try {
      const result: StorageExportResult = {
        cookies: [],
        localStorage: {},
        exportedAt: new Date().toISOString(),
      };

      // 导出 Cookies
      if (include.cookies) {
        const cookies = await this.exportCookies(context, domains);
        result.cookies = cookies;
      }

      // 导出 localStorage
      if (include.localStorage) {
        const localStorage = await this.exportLocalStorage(page, domains);
        result.localStorage = localStorage;
      }

      // 导出 sessionStorage
      if (include.sessionStorage) {
        const sessionStorage = await this.exportSessionStorage(page, domains);
        result.sessionStorage = sessionStorage;
      }

      this.logger.debug(
        `Exported storage: ${result.cookies.length} cookies, ` +
          `${Object.keys(result.localStorage).length} localStorage domains`,
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new StorageExportError(
        `Failed to export storage: ${message}`,
        error,
      );
    }
  }

  /**
   * 导入会话存储
   */
  async importStorage(
    context: BrowserContext,
    page: Page,
    data: ImportStorageInput,
  ): Promise<{
    imported: { cookies: number; localStorage: number; sessionStorage: number };
  }> {
    const imported = {
      cookies: 0,
      localStorage: 0,
      sessionStorage: 0,
    };

    try {
      // 导入 Cookies
      if (data.cookies && data.cookies.length > 0) {
        await this.importCookies(context, data.cookies);
        imported.cookies = data.cookies.length;
      }

      // 导入 localStorage
      if (data.localStorage && Object.keys(data.localStorage).length > 0) {
        const count = await this.importLocalStorage(page, data.localStorage);
        imported.localStorage = count;
      }

      // 导入 sessionStorage
      if (data.sessionStorage && Object.keys(data.sessionStorage).length > 0) {
        const count = await this.importSessionStorage(
          page,
          data.sessionStorage,
        );
        imported.sessionStorage = count;
      }

      this.logger.debug(
        `Imported storage: ${imported.cookies} cookies, ` +
          `${imported.localStorage} localStorage entries, ` +
          `${imported.sessionStorage} sessionStorage entries`,
      );

      return { imported };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new StorageImportError(
        `Failed to import storage: ${message}`,
        error,
      );
    }
  }

  /**
   * 清除会话存储
   */
  async clearStorage(
    context: BrowserContext,
    page: Page,
    options?: {
      cookies?: boolean;
      localStorage?: boolean;
      sessionStorage?: boolean;
    },
  ): Promise<void> {
    const {
      cookies = true,
      localStorage = true,
      sessionStorage = true,
    } = options ?? {};

    try {
      if (cookies) {
        await context.clearCookies();
      }

      if (localStorage) {
        await page.evaluate(() => {
          window.localStorage.clear();
        });
      }

      if (sessionStorage) {
        await page.evaluate(() => {
          window.sessionStorage.clear();
        });
      }

      this.logger.debug('Cleared session storage');
    } catch (error) {
      this.logger.warn(`Error clearing storage: ${error}`);
    }
  }

  /**
   * 导出 Cookies
   */
  private async exportCookies(
    context: BrowserContext,
    domains?: string[],
  ): Promise<CookieData[]> {
    const allCookies = await context.cookies();

    const cookies: CookieData[] = allCookies
      .filter((cookie) => {
        // 域名过滤
        if (domains && domains.length > 0) {
          return domains.some(
            (d) => cookie.domain === d || cookie.domain.endsWith(`.${d}`),
          );
        }
        return true;
      })
      .map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires > 0 ? cookie.expires : undefined,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      }));

    return cookies;
  }

  /**
   * 导出 localStorage
   */
  private async exportLocalStorage(
    page: Page,
    domains?: string[],
  ): Promise<Record<string, Record<string, string>>> {
    // 获取当前页面的 localStorage
    const currentUrl = page.url();
    let currentDomain: string | null = null;

    try {
      const url = new URL(currentUrl);
      currentDomain = url.hostname;
    } catch {
      // 可能是 about:blank
    }

    // 如果有域名过滤且当前域名不在列表中，返回空
    if (domains && domains.length > 0 && currentDomain) {
      if (
        !domains.some(
          (d) => currentDomain === d || currentDomain.endsWith(`.${d}`),
        )
      ) {
        return {};
      }
    }

    // 获取 localStorage 数据
    const data = await page.evaluate(() => {
      const result: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          result[key] = window.localStorage.getItem(key) ?? '';
        }
      }
      return result;
    });

    if (currentDomain && Object.keys(data).length > 0) {
      return { [currentDomain]: data };
    }

    return {};
  }

  /**
   * 导出 sessionStorage
   */
  private async exportSessionStorage(
    page: Page,
    domains?: string[],
  ): Promise<Record<string, Record<string, string>>> {
    const currentUrl = page.url();
    let currentDomain: string | null = null;

    try {
      const url = new URL(currentUrl);
      currentDomain = url.hostname;
    } catch {
      // 可能是 about:blank
    }

    if (domains && domains.length > 0 && currentDomain) {
      if (
        !domains.some(
          (d) => currentDomain === d || currentDomain.endsWith(`.${d}`),
        )
      ) {
        return {};
      }
    }

    const data = await page.evaluate(() => {
      const result: Record<string, string> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          result[key] = window.sessionStorage.getItem(key) ?? '';
        }
      }
      return result;
    });

    if (currentDomain && Object.keys(data).length > 0) {
      return { [currentDomain]: data };
    }

    return {};
  }

  /**
   * 导入 Cookies
   */
  private async importCookies(
    context: BrowserContext,
    cookies: ImportStorageInput['cookies'],
  ): Promise<void> {
    if (!cookies || cookies.length === 0) {
      return;
    }

    // 转换为 Playwright Cookie 格式
    const playwrightCookies = cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    }));

    await context.addCookies(playwrightCookies);
  }

  /**
   * 导入 localStorage
   */
  private async importLocalStorage(
    page: Page,
    localStorage: Record<string, Record<string, string>>,
  ): Promise<number> {
    let count = 0;

    // 获取当前页面域名
    const currentUrl = page.url();
    let currentDomain: string | null = null;

    try {
      const url = new URL(currentUrl);
      currentDomain = url.hostname;
    } catch {
      // 可能是 about:blank
    }

    // 只能导入当前域名的 localStorage
    if (currentDomain && localStorage[currentDomain]) {
      const data = localStorage[currentDomain];
      count = Object.keys(data).length;

      await page.evaluate((storageData) => {
        for (const [key, value] of Object.entries(storageData)) {
          window.localStorage.setItem(key, value);
        }
      }, data);
    }

    return count;
  }

  /**
   * 导入 sessionStorage
   */
  private async importSessionStorage(
    page: Page,
    sessionStorage: Record<string, Record<string, string>>,
  ): Promise<number> {
    let count = 0;

    const currentUrl = page.url();
    let currentDomain: string | null = null;

    try {
      const url = new URL(currentUrl);
      currentDomain = url.hostname;
    } catch {
      // 可能是 about:blank
    }

    if (currentDomain && sessionStorage[currentDomain]) {
      const data = sessionStorage[currentDomain];
      count = Object.keys(data).length;

      await page.evaluate((storageData) => {
        for (const [key, value] of Object.entries(storageData)) {
          window.sessionStorage.setItem(key, value);
        }
      }, data);
    }

    return count;
  }
}
