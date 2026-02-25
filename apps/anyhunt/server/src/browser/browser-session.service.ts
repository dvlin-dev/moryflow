/**
 * Browser Session Service
 *
 * [INPUT]: 会话操作请求
 * [OUTPUT]: 会话信息、快照、操作结果
 * [POS]: L2 Browser API 业务逻辑层，整合 SessionManager、SnapshotService、ActionHandler、
 *        CdpConnector、NetworkInterceptor、StoragePersistence（会话清理由 SessionManager 统一处理）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { UrlValidator } from '../common';
import { SessionManager } from './session';
import { SnapshotService } from './snapshot';
import { ActionHandler } from './handlers';
import { CdpConnectorService } from './cdp';
import { NetworkInterceptorService } from './network';
import {
  StoragePersistenceService,
  ProfilePersistenceService,
} from './persistence';
import { BrowserDiagnosticsService } from './diagnostics';
import {
  BrowserRiskTelemetryService,
  type BrowserRiskSummary,
} from './observability';
import { BrowserStreamService } from './streaming';
import {
  SitePolicyService,
  SiteRateLimiterService,
  BrowserPolicyDeniedError,
  BrowserNavigationRateLimitError,
} from './policy';
import {
  NavigationRetryService,
  BrowserNavigationError,
  RiskDetectionService,
  HumanBehaviorService,
} from './runtime';
import { StealthRegionService } from './stealth';
import type { RiskSignal } from './stealth';
import type {
  CreateSessionInput,
  CreateWindowInput,
  OpenUrlInput,
  SnapshotInput,
  DeltaSnapshotInput,
  ActionInput,
  ActionBatchInput,
  ActionBatchResponse,
  ScreenshotInput,
  ConnectCdpInput,
  InterceptRule,
  SetHeadersInput,
  ClearHeadersInput,
  ExportStorageInput,
  ImportStorageInput,
  SessionInfo,
  CdpSessionInfo,
  SnapshotResponse,
  DeltaSnapshotResponse,
  ActionResponse,
  ScreenshotResponse,
  WindowInfo,
  NetworkRequestRecord,
  StorageExportResult,
  TraceStartInput,
  TraceStopInput,
  HarStartInput,
  HarStopInput,
  LogQueryInput,
  SaveProfileInput,
  LoadProfileInput,
  CreateStreamInput,
} from './dto';

/** URL 验证失败错误 */
export class UrlNotAllowedError extends Error {
  constructor(url: string) {
    super(
      `URL not allowed: ${url}. Access to internal/private addresses is blocked.`,
    );
    this.name = 'UrlNotAllowedError';
  }
}

@Injectable()
export class BrowserSessionService {
  constructor(
    private readonly sessionManager: SessionManager,
    private readonly snapshotService: SnapshotService,
    private readonly actionHandler: ActionHandler,
    private readonly urlValidator: UrlValidator,
    private readonly cdpConnector: CdpConnectorService,
    private readonly networkInterceptor: NetworkInterceptorService,
    private readonly storagePersistence: StoragePersistenceService,
    private readonly profilePersistence: ProfilePersistenceService,
    private readonly diagnosticsService: BrowserDiagnosticsService,
    private readonly riskTelemetry: BrowserRiskTelemetryService,
    private readonly streamService: BrowserStreamService,
    private readonly sitePolicyService: SitePolicyService,
    private readonly siteRateLimiter: SiteRateLimiterService,
    private readonly navigationRetry: NavigationRetryService,
    private readonly stealthRegion: StealthRegionService,
    private readonly riskDetection: RiskDetectionService,
    private readonly humanBehavior: HumanBehaviorService,
  ) {}

  private assertSessionAccess(userId: string, sessionId: string): void {
    this.sessionManager.assertSessionOwnership(sessionId, userId);
  }

  private getSessionForUser(userId: string, sessionId: string) {
    return this.sessionManager.assertSessionOwnership(sessionId, userId);
  }

  /**
   * 创建会话
   */
  async createSession(
    userId: string,
    options?: Partial<CreateSessionInput>,
  ): Promise<SessionInfo> {
    const session = await this.sessionManager.createSession(options, userId);

    return {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      url: null,
      title: null,
    };
  }

  /**
   * 获取会话状态
   */
  async getSessionStatus(
    userId: string,
    sessionId: string,
  ): Promise<SessionInfo> {
    const session = this.getSessionForUser(userId, sessionId);
    const page = this.sessionManager.getActivePage(session);

    let title: string | null = null;
    try {
      title = await page.title();
    } catch {
      // 忽略标题获取失败
    }

    return {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      url: page.url() || null,
      title,
    };
  }

  /**
   * 关闭会话
   */
  async closeSession(userId: string, sessionId: string): Promise<void> {
    this.assertSessionAccess(userId, sessionId);
    await this.sessionManager.closeSession(sessionId);
    await this.streamService.cleanupSession(sessionId).catch(() => undefined);
  }

  /**
   * 打开 URL
   */
  async openUrl(
    userId: string,
    sessionId: string,
    options: OpenUrlInput,
  ): Promise<{ success: boolean; url: string; title: string | null }> {
    const {
      url,
      waitUntil = 'domcontentloaded',
      timeout = 30000,
      headers,
    } = options;

    // SSRF 防护
    if (!(await this.urlValidator.isAllowed(url))) {
      throw new UrlNotAllowedError(url);
    }

    const session = this.getSessionForUser(userId, sessionId);
    const context = this.sessionManager.getActiveContext(session);
    const page = this.sessionManager.getActivePage(session);

    const host = this.parseHost(url);
    const policy = this.sitePolicyService.resolve(host);
    try {
      this.sitePolicyService.assertNavigationAllowed({
        sessionId,
        host,
        url,
      });
    } catch (error) {
      if (error instanceof BrowserPolicyDeniedError) {
        this.riskTelemetry.recordPolicyBlock({
          host,
          reason: error.reason,
          policyId: error.policyId,
          sessionId,
          class: 'access_control',
        });
      }
      throw error;
    }

    const region = this.stealthRegion.resolveRegion(url);
    const navigationScopedHeaders: Record<string, string> = {
      ...(headers ?? {}),
    };
    if (region) {
      // 通过 scoped headers 合并写入，避免覆盖会话已有全局 headers
      navigationScopedHeaders['Accept-Language'] = region.acceptLanguage;
    }
    if (Object.keys(navigationScopedHeaders).length > 0) {
      const mergedScopedHeaders = this.mergeScopedHeadersForOrigin(
        sessionId,
        url,
        navigationScopedHeaders,
      );
      await this.networkInterceptor.setScopedHeaders(
        sessionId,
        context,
        url,
        mergedScopedHeaders,
      );
    }

    // stealth: 导航前随机抖动（300~1000ms）
    await this.sleep(this.humanBehavior.computeNavigationDelay());

    const navigateWithRetry = async (): Promise<{
      title: string | null;
      finalUrl: string;
      finalHost: string;
      finalPolicyId: string;
    }> => {
      return this.navigationRetry.run({
        host,
        budget: policy.retryBudget,
        execute: async () => {
          const releaseNavigationQuota = this.acquireNavigationQuota({
            host,
            policyId: policy.id,
            maxRps: policy.maxRps,
            maxBurst: policy.maxBurst,
            maxConcurrentNavigationsPerHost:
              policy.maxConcurrentNavigationsPerHost,
          });

          try {
            const response = await page.goto(url, { waitUntil, timeout });

            let title: string | null = null;
            try {
              title = await page.title();
            } catch {
              // 忽略
            }

            const finalUrl = page.url();
            const finalHost = this.parseHost(finalUrl, host);
            const finalPolicy = this.sitePolicyService.resolve(finalHost);
            this.sitePolicyService.assertNavigationAllowed({
              sessionId,
              host: finalHost,
              url: finalUrl,
            });

            const navigationError = this.navigationRetry.classifyResult({
              host: finalHost,
              responseStatus: response?.status() ?? null,
              finalUrl,
              title,
            });

            if (navigationError) {
              throw navigationError;
            }

            return {
              title,
              finalUrl,
              finalHost,
              finalPolicyId: finalPolicy.id,
            };
          } finally {
            releaseNavigationQuota();
          }
        },
      });
    };

    let navigationResult: {
      title: string | null;
      finalUrl: string;
      finalHost: string;
      finalPolicyId: string;
    };
    try {
      navigationResult = await navigateWithRetry();
    } catch (error) {
      if (error instanceof BrowserPolicyDeniedError) {
        this.riskTelemetry.recordPolicyBlock({
          host: error.host,
          reason: error.reason,
          policyId: error.policyId,
          sessionId,
          class: 'access_control',
        });
        throw error;
      }

      if (error instanceof BrowserNavigationRateLimitError) {
        this.riskTelemetry.recordRateLimitBlock({
          host: error.host,
          reason: error.reason,
          policyId: error.policyId,
          sessionId,
          class: 'access_control',
        });
        throw error;
      }

      const navigationError =
        error instanceof BrowserNavigationError
          ? error
          : this.navigationRetry.classifyError(host, error);
      const failurePolicyId = this.sitePolicyService.resolve(
        navigationError.host,
      ).id;

      this.riskTelemetry.recordNavigationResult({
        host: navigationError.host,
        reason: navigationError.reason,
        policyId: failurePolicyId,
        sessionId,
        class: navigationError.failureClass,
        success: false,
      });
      throw navigationError;
    }

    session.refs = new Map();
    this.snapshotService.clearCache(sessionId);

    this.riskTelemetry.recordNavigationResult({
      host: navigationResult.finalHost,
      reason: 'success',
      policyId: navigationResult.finalPolicyId,
      sessionId,
      class: 'none',
      success: true,
    });

    // stealth: 风险信号检测（全局 warn 模式 — 仅记录遥测，不阻断导航）
    let riskSignals = this.riskDetection.detect(
      page.url(),
      navigationResult.title ?? '',
    );
    if (riskSignals.length > 0) {
      this.riskTelemetry.recordNavigationResult({
        host: navigationResult.finalHost,
        reason: `risk_signal:${riskSignals[0].code}`,
        policyId: navigationResult.finalPolicyId,
        sessionId,
        class: 'access_control',
        success: true,
      });

      const recovered = await this.recoverFromRiskSignals({
        host,
        policy,
        sessionId,
        navigateWithRetry,
        originalSignals: riskSignals,
      });
      if (recovered) {
        navigationResult = recovered.navigationResult;
        riskSignals = recovered.riskSignals;
        this.riskTelemetry.recordNavigationResult({
          host: navigationResult.finalHost,
          reason: `risk_recovered:${recovered.originalSignals[0]?.code ?? 'unknown'}`,
          policyId: navigationResult.finalPolicyId,
          sessionId,
          class: 'none',
          success: true,
        });
      }
    }

    return {
      success: true,
      url: page.url(),
      title: navigationResult.title,
    };
  }

  private parseHost(url: string, fallback = 'unknown'): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return fallback;
    }
  }

  private async recoverFromRiskSignals(input: {
    host: string;
    policy: ReturnType<SitePolicyService['resolve']>;
    sessionId: string;
    originalSignals: RiskSignal[];
    navigateWithRetry: () => Promise<{
      title: string | null;
      finalUrl: string;
      finalHost: string;
      finalPolicyId: string;
    }>;
  }): Promise<{
    navigationResult: {
      title: string | null;
      finalUrl: string;
      finalHost: string;
      finalPolicyId: string;
    };
    riskSignals: RiskSignal[];
    originalSignals: RiskSignal[];
  } | null> {
    const maxRetryAttempts = 2;

    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      await this.sleep(this.computeRiskRetryBackoffMs(attempt));

      try {
        const navigationResult = await input.navigateWithRetry();
        const riskSignals = this.riskDetection.detect(
          navigationResult.finalUrl,
          navigationResult.title ?? '',
        );
        if (riskSignals.length === 0) {
          return {
            navigationResult,
            riskSignals,
            originalSignals: input.originalSignals,
          };
        }
      } catch {
        // warn 模式：风险恢复失败不阻断主流程
      }
    }

    this.riskTelemetry.recordNavigationResult({
      host: input.host,
      reason: `risk_persisted:${input.originalSignals[0]?.code ?? 'unknown'}`,
      policyId: input.policy.id,
      sessionId: input.sessionId,
      class: 'access_control',
      success: true,
    });

    return null;
  }

  private mergeScopedHeadersForOrigin(
    sessionId: string,
    origin: string,
    incoming: Record<string, string>,
  ): Record<string, string> {
    const normalizedHost = this.normalizeOriginHost(origin);
    const existing = this.networkInterceptor
      .getScopedHeaders(sessionId)
      .find((entry) => entry.origin === normalizedHost)?.headers;
    return {
      ...(existing ?? {}),
      ...incoming,
    };
  }

  private normalizeOriginHost(origin: string): string {
    try {
      const parsed = origin.startsWith('http')
        ? new URL(origin)
        : new URL(`https://${origin}`);
      return parsed.host.toLowerCase();
    } catch {
      return origin.toLowerCase();
    }
  }

  private computeRiskRetryBackoffMs(attempt: number): number {
    const baseDelay = 3000 + Math.floor(Math.random() * 4001);
    return baseDelay + (attempt - 1) * 500;
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private acquireNavigationQuota(input: {
    host: string;
    policyId: string;
    maxRps: number;
    maxBurst: number;
    maxConcurrentNavigationsPerHost: number;
  }): () => void {
    return this.siteRateLimiter.acquireNavigationQuota({
      host: input.host,
      policyId: input.policyId,
      maxRps: input.maxRps,
      maxBurst: input.maxBurst,
      maxConcurrentNavigationsPerHost: input.maxConcurrentNavigationsPerHost,
    });
  }

  /**
   * 获取页面快照
   */
  async getSnapshot(
    userId: string,
    sessionId: string,
    options?: Partial<SnapshotInput>,
  ): Promise<SnapshotResponse> {
    const session = this.getSessionForUser(userId, sessionId);
    const page = this.sessionManager.getActivePage(session);

    const { snapshot, refs } = await this.snapshotService.capture(
      page,
      options,
    );

    // 更新会话的 ref 映射
    this.sessionManager.updateRefs(sessionId, refs);

    return snapshot;
  }

  /**
   * 执行动作
   */
  async executeAction(
    userId: string,
    sessionId: string,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const session = this.getSessionForUser(userId, sessionId);

    return this.actionHandler.execute(session, action);
  }

  /**
   * 批量执行动作
   */
  async executeActionBatch(
    userId: string,
    sessionId: string,
    input: ActionBatchInput,
  ): Promise<ActionBatchResponse> {
    const session = this.getSessionForUser(userId, sessionId);
    const results: ActionResponse[] = [];

    for (const action of input.actions) {
      const result = await this.actionHandler.execute(session, action);
      results.push(result);
      if (!result.success && input.stopOnError) {
        break;
      }
    }

    return {
      success: results.every((result) => result.success),
      results,
    };
  }

  /**
   * 获取截图
   */
  async getScreenshot(
    userId: string,
    sessionId: string,
    options?: Partial<ScreenshotInput>,
  ): Promise<ScreenshotResponse> {
    const session = this.getSessionForUser(userId, sessionId);
    const page = this.sessionManager.getActivePage(session);

    const {
      selector,
      fullPage = false,
      format = 'png',
      quality,
    } = options ?? {};

    const screenshotOptions: NonNullable<
      Parameters<typeof page.screenshot>[0]
    > = {
      type: format,
    };

    if (format === 'jpeg' && quality !== undefined) {
      screenshotOptions.quality = quality;
    }

    let buffer: Buffer;
    let width: number;
    let height: number;

    if (selector) {
      // 元素截图
      const locator = this.sessionManager.resolveSelector(session, selector);
      buffer = await locator.screenshot(screenshotOptions);

      // 获取元素尺寸
      const box = await locator.boundingBox();
      width = box?.width ?? 0;
      height = box?.height ?? 0;
    } else {
      // 页面截图
      buffer = await page.screenshot({
        ...screenshotOptions,
        fullPage,
      });

      // 获取视口尺寸
      const viewportSize = page.viewportSize();
      if (fullPage) {
        // 全页截图需要获取实际尺寸
        const metrics = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
        }));
        width = metrics.width;
        height = metrics.height;
      } else {
        width = viewportSize?.width ?? 1280;
        height = viewportSize?.height ?? 800;
      }
    }

    return {
      data: buffer.toString('base64'),
      mimeType: format === 'jpeg' ? 'image/jpeg' : 'image/png',
      width,
      height,
    };
  }

  /**
   * 获取活跃会话数量
   */
  getActiveSessionCount(): number {
    return this.sessionManager.getActiveSessionCount();
  }

  // ==================== 多标签页管理 ====================

  /**
   * 创建新标签页
   */
  async createTab(userId: string, sessionId: string) {
    this.assertSessionAccess(userId, sessionId);
    return this.sessionManager.createTab(sessionId);
  }

  /**
   * 列出所有标签页
   */
  async listTabs(userId: string, sessionId: string) {
    this.assertSessionAccess(userId, sessionId);
    return this.sessionManager.listTabs(sessionId);
  }

  /**
   * 切换到指定标签页
   */
  async switchTab(userId: string, sessionId: string, tabIndex: number) {
    this.assertSessionAccess(userId, sessionId);
    return this.sessionManager.switchTab(sessionId, tabIndex);
  }

  /**
   * 关闭指定标签页
   */
  async closeTab(userId: string, sessionId: string, tabIndex: number) {
    this.assertSessionAccess(userId, sessionId);
    return this.sessionManager.closeTab(sessionId, tabIndex);
  }

  /**
   * 获取对话框历史
   */
  getDialogHistory(userId: string, sessionId: string) {
    this.assertSessionAccess(userId, sessionId);
    return this.sessionManager.getDialogHistory(sessionId);
  }

  // ==================== 多窗口管理 ====================

  /**
   * 创建新窗口（独立 BrowserContext，隔离 cookies/storage）
   */
  async createWindow(
    userId: string,
    sessionId: string,
    options?: CreateWindowInput,
  ): Promise<WindowInfo> {
    this.assertSessionAccess(userId, sessionId);
    const windowInfo = await this.sessionManager.createWindow(
      sessionId,
      options,
    );
    const session = this.getSessionForUser(userId, sessionId);
    const activeWindow = this.sessionManager.getActiveWindow(session);
    await this.networkInterceptor.registerContext(
      sessionId,
      activeWindow.context,
    );
    return windowInfo;
  }

  /**
   * 列出所有窗口
   */
  async listWindows(userId: string, sessionId: string): Promise<WindowInfo[]> {
    this.assertSessionAccess(userId, sessionId);
    return this.sessionManager.listWindows(sessionId);
  }

  /**
   * 切换到指定窗口
   */
  async switchWindow(
    userId: string,
    sessionId: string,
    windowIndex: number,
  ): Promise<WindowInfo> {
    this.assertSessionAccess(userId, sessionId);
    return this.sessionManager.switchWindow(sessionId, windowIndex);
  }

  /**
   * 关闭指定窗口
   */
  async closeWindow(
    userId: string,
    sessionId: string,
    windowIndex: number,
  ): Promise<void> {
    this.assertSessionAccess(userId, sessionId);
    return this.sessionManager.closeWindow(sessionId, windowIndex);
  }

  // ==================== P2.1 CDP 连接 ====================

  /**
   * 通过 CDP 连接到已运行的浏览器
   */
  async connectCdp(
    userId: string,
    options: ConnectCdpInput,
  ): Promise<CdpSessionInfo> {
    // 建立 CDP 连接
    const connection = await this.cdpConnector.connect({
      provider: options.provider,
      wsEndpoint: options.wsEndpoint,
      port: options.port,
      timeout: options.timeout,
    });

    // 创建 BrowserContext
    const context = await this.cdpConnector.createContext(connection);

    // 创建会话
    const session = await this.sessionManager.createCdpSession(
      context,
      connection.wsEndpoint,
      undefined,
      userId,
    );

    const page = this.sessionManager.getActivePage(session);
    return {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      url: page.url() || null,
      title: null,
      isCdpConnection: true,
      wsEndpoint: connection.wsEndpoint,
    };
  }

  // ==================== P2.2 网络拦截 ====================

  /**
   * 设置网络拦截规则
   */
  async setInterceptRules(
    userId: string,
    sessionId: string,
    rules: InterceptRule[],
  ): Promise<{ rulesCount: number }> {
    const session = this.getSessionForUser(userId, sessionId);
    const activeWindow = this.sessionManager.getActiveWindow(session);
    await Promise.all(
      session.windows.map((window) =>
        this.networkInterceptor.registerContext(sessionId, window.context),
      ),
    );
    return this.networkInterceptor.setRules(
      sessionId,
      activeWindow.context,
      rules,
    );
  }

  /**
   * 添加单条拦截规则
   */
  async addInterceptRule(
    userId: string,
    sessionId: string,
    rule: InterceptRule,
  ): Promise<{ ruleId: string }> {
    const session = this.getSessionForUser(userId, sessionId);
    const activeWindow = this.sessionManager.getActiveWindow(session);
    await Promise.all(
      session.windows.map((window) =>
        this.networkInterceptor.registerContext(sessionId, window.context),
      ),
    );
    return this.networkInterceptor.addRule(
      sessionId,
      activeWindow.context,
      rule,
    );
  }

  /**
   * 移除拦截规则
   */
  removeInterceptRule(
    userId: string,
    sessionId: string,
    ruleId: string,
  ): boolean {
    this.assertSessionAccess(userId, sessionId);
    return this.networkInterceptor.removeRule(sessionId, ruleId);
  }

  /**
   * 清除所有拦截规则
   */
  async clearInterceptRules(userId: string, sessionId: string): Promise<void> {
    this.assertSessionAccess(userId, sessionId);
    return this.networkInterceptor.clearRules(sessionId);
  }

  /**
   * 获取当前拦截规则
   */
  getInterceptRules(userId: string, sessionId: string): InterceptRule[] {
    this.assertSessionAccess(userId, sessionId);
    return this.networkInterceptor.getRules(sessionId);
  }

  /**
   * 获取网络请求历史
   */
  getNetworkHistory(
    userId: string,
    sessionId: string,
    options?: { limit?: number; urlFilter?: string },
  ): NetworkRequestRecord[] {
    this.assertSessionAccess(userId, sessionId);
    return this.networkInterceptor.getRequestHistory(sessionId, options);
  }

  /**
   * 清除网络历史记录
   */
  clearNetworkHistory(userId: string, sessionId: string): void {
    this.assertSessionAccess(userId, sessionId);
    this.networkInterceptor.clearHistory(sessionId);
  }

  // ==================== P2.2.1 Headers ====================

  async setHeaders(
    userId: string,
    sessionId: string,
    input: SetHeadersInput,
  ): Promise<{ scope: 'global' | 'origin'; origin?: string }> {
    const session = this.getSessionForUser(userId, sessionId);
    const activeWindow = this.sessionManager.getActiveWindow(session);

    if (input.origin) {
      await this.networkInterceptor.setScopedHeaders(
        sessionId,
        activeWindow.context,
        input.origin,
        input.headers,
      );
      return { scope: 'origin', origin: input.origin };
    }

    await Promise.all(
      session.windows.map((window) =>
        window.context.setExtraHTTPHeaders(input.headers),
      ),
    );
    return { scope: 'global' };
  }

  async clearHeaders(
    userId: string,
    sessionId: string,
    input: ClearHeadersInput,
  ): Promise<void> {
    const session = this.getSessionForUser(userId, sessionId);

    if (input.clearGlobal) {
      await Promise.all(
        session.windows.map((window) => window.context.setExtraHTTPHeaders({})),
      );
    }

    if (input.origin) {
      await this.networkInterceptor.clearScopedHeaders(sessionId, input.origin);
      return;
    }

    if (!input.origin) {
      await this.networkInterceptor.clearScopedHeaders(sessionId);
    }
  }

  // ==================== P2.3 会话持久化 ====================

  /**
   * 导出会话存储
   */
  async exportStorage(
    userId: string,
    sessionId: string,
    options?: ExportStorageInput,
  ): Promise<StorageExportResult> {
    const session = this.getSessionForUser(userId, sessionId);
    const context = this.sessionManager.getActiveContext(session);
    const page = this.sessionManager.getActivePage(session);
    return this.storagePersistence.exportStorage(context, page, options);
  }

  /**
   * 导入会话存储
   */
  async importStorage(
    userId: string,
    sessionId: string,
    data: ImportStorageInput,
  ): Promise<{
    imported: { cookies: number; localStorage: number; sessionStorage: number };
  }> {
    const session = this.getSessionForUser(userId, sessionId);
    const context = this.sessionManager.getActiveContext(session);
    const page = this.sessionManager.getActivePage(session);
    return this.storagePersistence.importStorage(context, page, data);
  }

  /**
   * 清除会话存储
   */
  async clearStorage(
    userId: string,
    sessionId: string,
    options?: {
      cookies?: boolean;
      localStorage?: boolean;
      sessionStorage?: boolean;
    },
  ): Promise<void> {
    const session = this.getSessionForUser(userId, sessionId);
    const context = this.sessionManager.getActiveContext(session);
    const page = this.sessionManager.getActivePage(session);
    return this.storagePersistence.clearStorage(context, page, options);
  }

  // ==================== P2.3.1 Profile 持久化 ====================

  async saveProfile(
    userId: string,
    sessionId: string,
    input: SaveProfileInput,
  ): Promise<{ profileId: string; storedAt: string; size: number }> {
    const session = this.getSessionForUser(userId, sessionId);
    const context = this.sessionManager.getActiveContext(session);
    const page = this.sessionManager.getActivePage(session);
    return this.profilePersistence.saveProfile(userId, context, page, input);
  }

  async loadProfile(
    userId: string,
    sessionId: string,
    input: LoadProfileInput,
  ): Promise<{
    imported: { cookies: number; localStorage: number; sessionStorage: number };
  }> {
    const session = this.getSessionForUser(userId, sessionId);
    const context = this.sessionManager.getActiveContext(session);
    const page = this.sessionManager.getActivePage(session);
    return this.profilePersistence.loadProfile(userId, context, page, input);
  }

  // ==================== P2.3.2 诊断与观测 ====================

  getConsoleMessages(
    userId: string,
    sessionId: string,
    options?: LogQueryInput,
  ) {
    this.assertSessionAccess(userId, sessionId);
    return this.diagnosticsService.getConsoleMessages(
      sessionId,
      options?.limit,
    );
  }

  clearConsoleMessages(userId: string, sessionId: string): void {
    this.assertSessionAccess(userId, sessionId);
    this.diagnosticsService.clearConsoleMessages(sessionId);
  }

  getPageErrors(userId: string, sessionId: string, options?: LogQueryInput) {
    this.assertSessionAccess(userId, sessionId);
    return this.diagnosticsService.getPageErrors(sessionId, options?.limit);
  }

  clearPageErrors(userId: string, sessionId: string): void {
    this.assertSessionAccess(userId, sessionId);
    this.diagnosticsService.clearPageErrors(sessionId);
  }

  getDetectionRisk(userId: string, sessionId: string): BrowserRiskSummary {
    this.assertSessionAccess(userId, sessionId);
    return this.riskTelemetry.getSessionSummary(sessionId);
  }

  async startTrace(
    userId: string,
    sessionId: string,
    input: TraceStartInput,
  ): Promise<{ started: boolean }> {
    const session = this.getSessionForUser(userId, sessionId);
    const context = this.sessionManager.getActiveContext(session);
    await this.diagnosticsService.startTracing(sessionId, context, input);
    return { started: true };
  }

  async stopTrace(userId: string, sessionId: string, input: TraceStopInput) {
    const session = this.getSessionForUser(userId, sessionId);
    const context = this.sessionManager.getActiveContext(session);
    return this.diagnosticsService.stopTracing(
      sessionId,
      context,
      input.store ?? true,
    );
  }

  async startHar(
    userId: string,
    sessionId: string,
    input: HarStartInput,
  ): Promise<{ started: boolean }> {
    const session = this.getSessionForUser(userId, sessionId);
    const windows = session.windows;
    for (let i = 0; i < windows.length; i++) {
      await this.networkInterceptor.startRecording(
        sessionId,
        windows[i].context,
        {
          clear: input.clear && i === 0,
        },
      );
    }
    return { started: true };
  }

  async stopHar(
    userId: string,
    sessionId: string,
    input: HarStopInput,
  ): Promise<{ requestCount: number; requests?: NetworkRequestRecord[] }> {
    this.assertSessionAccess(userId, sessionId);
    const records = await this.networkInterceptor.stopRecording(sessionId);
    return {
      requestCount: records.length,
      requests: input.includeRequests ? records : undefined,
    };
  }

  // ==================== P2.3.3 Streaming ====================

  createStreamToken(
    userId: string,
    sessionId: string,
    input: CreateStreamInput,
  ): { token: string; wsUrl: string; expiresAt: number } {
    this.assertSessionAccess(userId, sessionId);
    const expiresIn = input.expiresIn ?? 300;
    return this.streamService.createToken(sessionId, expiresIn);
  }

  // ==================== P2.4 增量快照 ====================

  /**
   * 获取增量快照（delta 模式）
   */
  async getDeltaSnapshot(
    userId: string,
    sessionId: string,
    options?: Partial<DeltaSnapshotInput>,
  ): Promise<DeltaSnapshotResponse> {
    const session = this.getSessionForUser(userId, sessionId);
    const page = this.sessionManager.getActivePage(session);

    const { snapshot, refs } = await this.snapshotService.captureDelta(
      sessionId,
      page,
      options,
    );

    // 更新会话的 ref 映射
    this.sessionManager.updateRefs(sessionId, refs);

    return snapshot;
  }
}
