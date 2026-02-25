/**
 * [INPUT]: 浏览器实例请求
 * [OUTPUT]: Playwright BrowserContext 实例（支持上下文选项）
 * [POS]: 浏览器实例池管理，复用实例，自动回收，健康检查
 *
 * 作为独立基础设施模块，供 screenshot、automation 等模块复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { chromium, type BrowserContext, type Route } from 'playwright';
import { UrlValidator } from '../common/validators/url.validator';
import { StealthCdpService } from './stealth/stealth-cdp.service';
import { StealthRegionService } from './stealth/stealth-region.service';
import { buildStealthScript } from './stealth/stealth-patches';
import { STEALTH_CHROMIUM_ARGS } from './stealth/stealth-launch-args';
import type {
  BrowserInstance,
  BrowserContextOptions,
  WaitingRequest,
  BrowserPoolStatus,
  BrowserPoolDetailedStatus,
} from './browser.types';
import {
  BROWSER_POOL_SIZE,
  BROWSER_WARMUP_COUNT,
  BROWSER_IDLE_TIMEOUT,
  BROWSER_ACQUIRE_TIMEOUT,
  MAX_PAGES_PER_BROWSER,
  MAX_CONCURRENT_PAGES,
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
  getSystemResources,
} from './browser.constants';

/** 简单的互斥锁，防止并发创建过多实例 */
class Mutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    const next = this.waitQueue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}

/** 浏览器不可用错误 */
export class BrowserUnavailableError extends Error {
  constructor(message: string) {
    super(`Browser unavailable: ${message}`);
    this.name = 'BrowserUnavailableError';
  }
}

@Injectable()
export class BrowserPool implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserPool.name);

  /** 浏览器实例池 */
  private readonly instances: BrowserInstance[] = [];

  /** 等待队列 */
  private readonly waitingQueue: WaitingRequest[] = [];

  /** 清理定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /** 是否正在关闭 */
  private isShuttingDown = false;

  /** 实例创建互斥锁，防止并发创建超出上限 */
  private readonly createMutex = new Mutex();
  private readonly NON_HTTP_ALLOWLIST = new Set(['about:', 'data:', 'blob:']);

  constructor(
    private readonly urlValidator: UrlValidator,
    private readonly stealthCdp: StealthCdpService,
    private readonly stealthRegion: StealthRegionService,
  ) {}

  async onModuleInit() {
    // 输出系统资源检测信息
    const resources = getSystemResources();
    this.logger.log('=== Browser Pool Configuration ===');
    this.logger.log(
      `System: ${resources.cpuCount} CPU cores, ${resources.totalMemoryGB}GB RAM (${resources.freeMemoryGB}GB free)`,
    );
    this.logger.log(
      `Pool size: ${BROWSER_POOL_SIZE} (recommended: ${resources.recommendedPoolSize})`,
    );
    this.logger.log(
      `Warmup count: ${BROWSER_WARMUP_COUNT} (recommended: ${resources.recommendedWarmupCount})`,
    );
    this.logger.log(
      `Max pages per browser: ${MAX_PAGES_PER_BROWSER} (recommended: ${resources.recommendedMaxPages})`,
    );
    this.logger.log(`Max concurrent pages: ${MAX_CONCURRENT_PAGES}`);
    this.logger.log('==================================');

    // 预热：并行创建多个浏览器实例，部分失败不影响其他
    const warmupCount = Math.min(BROWSER_WARMUP_COUNT, BROWSER_POOL_SIZE);
    this.logger.log(`Warming up ${warmupCount} browser instance(s)...`);

    const warmupPromises = Array.from({ length: warmupCount }, () =>
      this.createInstance(),
    );
    const results = await Promise.allSettled(warmupPromises);

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed > 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason as unknown);
      this.logger.warn(
        `Browser warmup: ${succeeded} succeeded, ${failed} failed`,
        errors,
      );
    }

    this.logger.log(
      `Browser pool warmed up with ${succeeded}/${warmupCount} instance(s)`,
    );

    // 启动定期清理
    this.startCleanupTimer();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    this.logger.log('Shutting down browser pool');

    // 停止清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 拒绝所有等待中的请求
    for (const request of this.waitingQueue) {
      clearTimeout(request.timeoutId);
      request.reject(new Error('Browser pool is shutting down'));
    }
    this.waitingQueue.length = 0;

    // 关闭所有浏览器实例
    await this.closeAllInstances();
  }

  /**
   * 获取浏览器上下文
   * 如果池已满且没有可用实例，会排队等待
   */
  async acquireContext(
    options?: BrowserContextOptions,
  ): Promise<BrowserContext> {
    if (this.isShuttingDown) {
      throw new BrowserUnavailableError('Browser pool is shutting down');
    }

    // 查找可用的浏览器实例
    const instance = this.findAvailableInstance();

    if (instance) {
      return this.createContextFromInstance(instance, options);
    }

    // 使用互斥锁防止并发创建过多实例
    await this.createMutex.acquire();
    try {
      // 获取锁后再次检查（可能其他请求已创建）
      const instanceAfterLock = this.findAvailableInstance();
      if (instanceAfterLock) {
        return this.createContextFromInstance(instanceAfterLock, options);
      }

      // 如果池未满，创建新实例
      if (this.instances.length < BROWSER_POOL_SIZE) {
        const newInstance = await this.createInstance();
        return this.createContextFromInstance(newInstance, options);
      }
    } finally {
      this.createMutex.release();
    }

    // 池已满，排队等待
    return this.waitForAvailableContext(options);
  }

  /**
   * 释放浏览器上下文
   */
  async releaseContext(context: BrowserContext): Promise<void> {
    try {
      // 关闭上下文
      await context.close();

      // 更新实例状态
      const browser = context.browser();
      if (browser) {
        const instance = this.instances.find((i) => i.browser === browser);
        if (instance) {
          instance.pageCount = Math.max(0, instance.pageCount - 1);
          instance.lastUsedAt = Date.now();

          // 检查是否有等待的请求（异步执行，不阻塞释放）
          this.processWaitingQueue().catch((error) => {
            this.logger.warn(`Error processing waiting queue: ${error}`);
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Error releasing context: ${error}`);
    }
  }

  /**
   * 获取池状态（用于健康检查）
   */
  getPoolStatus(): BrowserPoolStatus {
    const healthy = this.instances.filter((i) => i.isHealthy).length;
    const totalPages = this.instances.reduce((sum, i) => sum + i.pageCount, 0);

    return {
      total: this.instances.length,
      healthy,
      totalPages,
      waitingCount: this.waitingQueue.length,
    };
  }

  /**
   * 获取池详细状态（用于 Admin 监控）
   */
  getDetailedStatus(): BrowserPoolDetailedStatus {
    const now = Date.now();
    const resources = getSystemResources();
    const basicStatus = this.getPoolStatus();

    return {
      ...basicStatus,
      config: {
        maxPoolSize: BROWSER_POOL_SIZE,
        warmupCount: BROWSER_WARMUP_COUNT,
        maxPagesPerBrowser: MAX_PAGES_PER_BROWSER,
        maxConcurrentPages: MAX_CONCURRENT_PAGES,
        idleTimeoutSeconds: BROWSER_IDLE_TIMEOUT / 1000,
      },
      system: {
        cpuCount: resources.cpuCount,
        totalMemoryGB: resources.totalMemoryGB,
        freeMemoryGB: resources.freeMemoryGB,
      },
      utilization: {
        poolUtilization: Math.round(
          (basicStatus.total / BROWSER_POOL_SIZE) * 100,
        ),
        pageUtilization: Math.round(
          (basicStatus.totalPages / MAX_CONCURRENT_PAGES) * 100,
        ),
      },
      instances: this.instances.map((instance) => ({
        id: instance.id,
        pageCount: instance.pageCount,
        isHealthy: instance.isHealthy,
        idleSeconds: Math.round((now - instance.lastUsedAt) / 1000),
      })),
    };
  }

  /**
   * 创建新的浏览器实例
   */
  private async createInstance(): Promise<BrowserInstance> {
    this.logger.debug('Creating new browser instance');

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-first-run',
        '--safebrowsing-disable-auto-update',
        // 限制内存使用
        '--js-flags=--max-old-space-size=512',
        // stealth 反检测参数
        ...STEALTH_CHROMIUM_ARGS,
      ],
    });

    // Browser 级别 CDP 覆写：去除 HeadlessChrome 标记
    await this.stealthCdp.applyBrowserLevelStealth(browser);

    const instance: BrowserInstance = {
      id: `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      browser,
      pageCount: 0,
      lastUsedAt: Date.now(),
      isHealthy: true,
    };

    // 监听断开连接
    browser.on('disconnected', () => {
      this.logger.warn('Browser disconnected unexpectedly');
      this.handleBrowserDisconnect(instance);
    });

    this.instances.push(instance);
    this.logger.debug(
      `Browser instance created. Pool size: ${this.instances.length}`,
    );

    return instance;
  }

  /**
   * 从实例创建上下文
   */
  private async createContextFromInstance(
    instance: BrowserInstance,
    options?: BrowserContextOptions,
  ): Promise<BrowserContext> {
    // 先增加计数，失败时回滚
    instance.pageCount++;
    instance.lastUsedAt = Date.now();

    try {
      const viewport = options?.viewport ?? {
        width: DEFAULT_VIEWPORT_WIDTH,
        height: DEFAULT_VIEWPORT_HEIGHT,
      };
      const javaScriptEnabled = options?.javaScriptEnabled ?? true;
      const ignoreHTTPSErrors = options?.ignoreHTTPSErrors ?? true;
      const regionSignal =
        options?.regionHint && !options?.locale && !options?.timezoneId
          ? this.stealthRegion.resolveRegion(options.regionHint)
          : null;
      const resolvedLocale = options?.locale ?? regionSignal?.locale;
      const resolvedTimezoneId = options?.timezoneId ?? regionSignal?.timezone;
      const acceptLanguage = this.resolveAcceptLanguage(
        options,
        regionSignal?.acceptLanguage,
        resolvedLocale,
      );
      const stealthLocale =
        resolvedLocale ?? this.extractPrimaryLocale(acceptLanguage);

      // 创建独立的浏览器上下文
      const context = await instance.browser.newContext({
        // 禁用 JavaScript 错误弹窗
        javaScriptEnabled,
        // 忽略 HTTPS 错误
        ignoreHTTPSErrors,
        // 视口
        viewport,
        // User-Agent
        userAgent: options?.userAgent,
        // locale/timezone
        locale: resolvedLocale,
        timezoneId: resolvedTimezoneId,
        // geolocation
        geolocation: options?.geolocation,
        // media
        colorScheme: options?.colorScheme,
        reducedMotion: options?.reducedMotion,
        // headers / credentials
        extraHTTPHeaders: options?.extraHTTPHeaders,
        httpCredentials: options?.httpCredentials,
        // device options
        deviceScaleFactor: options?.deviceScaleFactor,
        isMobile: options?.isMobile,
        hasTouch: options?.hasTouch,
        // downloads / recording
        acceptDownloads: options?.acceptDownloads,
        recordVideo: options?.recordVideo,
      });

      // stealth: 注入 init-script 补丁（在页面脚本前执行）
      const stealthScript = buildStealthScript({
        locale: stealthLocale,
      });
      await context.addInitScript({ content: stealthScript });

      // stealth: 每个新页面自动应用 page 级别 CDP 覆写
      context.on('page', (page) => {
        this.stealthCdp
          .applyPageLevelStealth(page, {
            locale: stealthLocale,
            userAgent: options?.userAgent,
            acceptLanguage,
          })
          .catch(() => {});
      });

      await this.attachNetworkGuard(context);

      return context;
    } catch (error) {
      // 创建失败，回滚计数
      instance.pageCount = Math.max(0, instance.pageCount - 1);
      throw error;
    }
  }

  private async attachNetworkGuard(context: BrowserContext): Promise<void> {
    await context.route('**/*', async (route: Route) => {
      const requestUrl = route.request().url();
      const protocol = this.getProtocol(requestUrl);

      if (!protocol) {
        await route.abort('blockedbyclient');
        return;
      }

      if (protocol === 'http:' || protocol === 'https:') {
        const allowed = await this.urlValidator.isAllowed(requestUrl);
        if (!allowed) {
          this.logger.warn(`Blocked browser request: ${requestUrl}`);
          await route.abort('blockedbyclient');
          return;
        }

        await route.fallback();
        return;
      }

      if (protocol === 'ws:' || protocol === 'wss:') {
        const normalizedUrl =
          protocol === 'ws:'
            ? requestUrl.replace(/^ws:/i, 'http:')
            : requestUrl.replace(/^wss:/i, 'https:');
        const allowed = await this.urlValidator.isAllowed(normalizedUrl);
        if (!allowed) {
          this.logger.warn(`Blocked browser request: ${requestUrl}`);
          await route.abort('blockedbyclient');
          return;
        }

        await route.fallback();
        return;
      }

      if (this.NON_HTTP_ALLOWLIST.has(protocol)) {
        await route.fallback();
        return;
      }

      await route.abort('blockedbyclient');
    });
  }

  private getProtocol(url: string): string | null {
    try {
      return new URL(url).protocol;
    } catch {
      return null;
    }
  }

  private resolveAcceptLanguage(
    options?: BrowserContextOptions,
    regionAcceptLanguage?: string,
    resolvedLocale?: string,
  ): string | undefined {
    const headers = options?.extraHTTPHeaders;
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === 'accept-language') {
          const normalized = value.trim();
          if (normalized) return normalized;
        }
      }
    }

    if (regionAcceptLanguage) {
      return regionAcceptLanguage;
    }

    const locale = options?.locale ?? resolvedLocale;
    if (locale) {
      const base = locale.split('-')[0];
      if (base && base !== locale) {
        return `${locale},${base};q=0.9`;
      }
      return locale;
    }

    return undefined;
  }

  private extractPrimaryLocale(value?: string): string | undefined {
    if (!value) return undefined;
    return value
      .split(',')
      .map((item) => item.split(';')[0]?.trim())
      .find(Boolean);
  }

  /**
   * 查找可用的浏览器实例
   */
  private findAvailableInstance(): BrowserInstance | null {
    // 按页面数量排序，优先使用负载低的实例
    const availableInstances = this.instances
      .filter((i) => i.isHealthy && i.pageCount < MAX_PAGES_PER_BROWSER)
      .sort((a, b) => a.pageCount - b.pageCount);

    return availableInstances[0] || null;
  }

  /**
   * 等待可用的上下文
   */
  private waitForAvailableContext(
    options?: BrowserContextOptions,
  ): Promise<BrowserContext> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // 从队列中移除
        const index = this.waitingQueue.findIndex(
          (r) => r.timeoutId === timeoutId,
        );
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(
          new BrowserUnavailableError(
            `Timeout waiting for browser (${BROWSER_ACQUIRE_TIMEOUT}ms)`,
          ),
        );
      }, BROWSER_ACQUIRE_TIMEOUT);

      this.waitingQueue.push({ resolve, reject, timeoutId, options });
    });
  }

  /**
   * 处理等待队列
   */
  private async processWaitingQueue(): Promise<void> {
    while (this.waitingQueue.length > 0) {
      const instance = this.findAvailableInstance();
      if (!instance) {
        break;
      }

      const request = this.waitingQueue.shift();
      if (request) {
        clearTimeout(request.timeoutId);
        try {
          const context = await this.createContextFromInstance(
            instance,
            request.options,
          );
          request.resolve(context);
        } catch (error) {
          request.reject(error as Error);
        }
      }
    }
  }

  /**
   * 处理浏览器断开连接
   */
  private handleBrowserDisconnect(instance: BrowserInstance): void {
    instance.isHealthy = false;

    // 从池中移除
    const index = this.instances.indexOf(instance);
    if (index !== -1) {
      this.instances.splice(index, 1);
      this.logger.debug(
        `Removed disconnected browser. Pool size: ${this.instances.length}`,
      );
    }

    // 如果有等待的请求，尝试创建新实例
    if (
      this.waitingQueue.length > 0 &&
      this.instances.length < BROWSER_POOL_SIZE
    ) {
      this.createInstance()
        .then(() => this.processWaitingQueue())
        .catch((err) =>
          this.logger.error('Failed to create replacement browser', err),
        );
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanupTimer(): void {
    // 每分钟检查一次
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleInstances().catch((error) => {
        this.logger.error('Error during idle instance cleanup', error);
      });
    }, 60 * 1000);
  }

  /**
   * 清理空闲实例
   */
  private async cleanupIdleInstances(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const now = Date.now();
    const idleInstances = this.instances.filter(
      (i) => i.pageCount === 0 && now - i.lastUsedAt > BROWSER_IDLE_TIMEOUT,
    );

    // 至少保留预热数量的实例
    const minInstances = Math.min(BROWSER_WARMUP_COUNT, BROWSER_POOL_SIZE);
    const toClose = idleInstances.slice(
      0,
      Math.max(0, this.instances.length - minInstances),
    );

    for (const instance of toClose) {
      await this.closeInstance(instance);
    }

    if (toClose.length > 0) {
      this.logger.debug(`Cleaned up ${toClose.length} idle browser instances`);
    }
  }

  /**
   * 关闭单个实例
   */
  private async closeInstance(instance: BrowserInstance): Promise<void> {
    instance.isHealthy = false;

    // 从池中移除
    const index = this.instances.indexOf(instance);
    if (index !== -1) {
      this.instances.splice(index, 1);
    }

    try {
      await instance.browser.close();
    } catch (error) {
      this.logger.warn(`Error closing browser: ${error}`);
    }
  }

  /**
   * 关闭所有实例
   */
  private async closeAllInstances(): Promise<void> {
    const closePromises = this.instances.map(async (instance) => {
      try {
        await instance.browser.close();
      } catch (error) {
        this.logger.warn(`Error closing browser: ${error}`);
      }
    });

    await Promise.all(closePromises);
    this.instances.length = 0;
    this.logger.log('All browser instances closed');
  }
}
