/**
 * Browser Session Service
 *
 * [INPUT]: 会话操作请求
 * [OUTPUT]: 会话信息、快照、操作结果
 * [POS]: L2 Browser API 业务逻辑层，整合 SessionManager、SnapshotService、ActionHandler、
 *        CdpConnector、NetworkInterceptor、StoragePersistence
 */

import { Injectable, Logger } from '@nestjs/common';
import { UrlValidator } from '../common';
import { SessionManager } from './session';
import { SnapshotService } from './snapshot';
import { ActionHandler } from './handlers';
import { CdpConnectorService } from './cdp';
import { NetworkInterceptorService } from './network';
import { StoragePersistenceService } from './persistence';
import type {
  CreateSessionInput,
  CreateWindowInput,
  OpenUrlInput,
  SnapshotInput,
  DeltaSnapshotInput,
  ActionInput,
  ScreenshotInput,
  ConnectCdpInput,
  InterceptRule,
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
  private readonly logger = new Logger(BrowserSessionService.name);

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly snapshotService: SnapshotService,
    private readonly actionHandler: ActionHandler,
    private readonly urlValidator: UrlValidator,
    private readonly cdpConnector: CdpConnectorService,
    private readonly networkInterceptor: NetworkInterceptorService,
    private readonly storagePersistence: StoragePersistenceService,
  ) {}

  /**
   * 创建会话
   */
  async createSession(
    options?: Partial<CreateSessionInput>,
  ): Promise<SessionInfo> {
    const session = await this.sessionManager.createSession(options);

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
  async getSessionStatus(sessionId: string): Promise<SessionInfo> {
    const session = this.sessionManager.getSession(sessionId);

    let title: string | null = null;
    try {
      title = await session.page.title();
    } catch {
      // 忽略标题获取失败
    }

    return {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      url: session.page.url() || null,
      title,
    };
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string): Promise<void> {
    await this.sessionManager.closeSession(sessionId);
  }

  /**
   * 打开 URL
   */
  async openUrl(
    sessionId: string,
    options: OpenUrlInput,
  ): Promise<{ success: boolean; url: string; title: string | null }> {
    const { url, waitUntil = 'domcontentloaded', timeout = 30000 } = options;

    // SSRF 防护
    if (!this.urlValidator.isAllowed(url)) {
      throw new UrlNotAllowedError(url);
    }

    const session = this.sessionManager.getSession(sessionId);

    await session.page.goto(url, { waitUntil, timeout });

    let title: string | null = null;
    try {
      title = await session.page.title();
    } catch {
      // 忽略
    }

    return {
      success: true,
      url: session.page.url(),
      title,
    };
  }

  /**
   * 获取页面快照
   */
  async getSnapshot(
    sessionId: string,
    options?: Partial<SnapshotInput>,
  ): Promise<SnapshotResponse> {
    const session = this.sessionManager.getSession(sessionId);

    const { snapshot, refs } = await this.snapshotService.capture(
      session.page,
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
    sessionId: string,
    action: ActionInput,
  ): Promise<ActionResponse> {
    const session = this.sessionManager.getSession(sessionId);

    return this.actionHandler.execute(session, action);
  }

  /**
   * 获取截图
   */
  async getScreenshot(
    sessionId: string,
    options?: Partial<ScreenshotInput>,
  ): Promise<ScreenshotResponse> {
    const session = this.sessionManager.getSession(sessionId);

    const {
      selector,
      fullPage = false,
      format = 'png',
      quality,
    } = options ?? {};

    const screenshotOptions: Parameters<typeof session.page.screenshot>[0] = {
      type: format,
      fullPage,
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
      buffer = await session.page.screenshot(screenshotOptions);

      // 获取视口尺寸
      const viewportSize = session.page.viewportSize();
      if (fullPage) {
        // 全页截图需要获取实际尺寸
        const metrics = await session.page.evaluate(() => ({
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
  async createTab(sessionId: string) {
    return this.sessionManager.createTab(sessionId);
  }

  /**
   * 列出所有标签页
   */
  async listTabs(sessionId: string) {
    return this.sessionManager.listTabs(sessionId);
  }

  /**
   * 切换到指定标签页
   */
  async switchTab(sessionId: string, tabIndex: number) {
    return this.sessionManager.switchTab(sessionId, tabIndex);
  }

  /**
   * 关闭指定标签页
   */
  async closeTab(sessionId: string, tabIndex: number) {
    return this.sessionManager.closeTab(sessionId, tabIndex);
  }

  /**
   * 获取对话框历史
   */
  getDialogHistory(sessionId: string) {
    return this.sessionManager.getDialogHistory(sessionId);
  }

  // ==================== 多窗口管理 ====================

  /**
   * 创建新窗口（独立 BrowserContext，隔离 cookies/storage）
   */
  async createWindow(
    sessionId: string,
    options?: CreateWindowInput,
  ): Promise<WindowInfo> {
    return this.sessionManager.createWindow(sessionId, options);
  }

  /**
   * 列出所有窗口
   */
  async listWindows(sessionId: string): Promise<WindowInfo[]> {
    return this.sessionManager.listWindows(sessionId);
  }

  /**
   * 切换到指定窗口
   */
  async switchWindow(
    sessionId: string,
    windowIndex: number,
  ): Promise<WindowInfo> {
    return this.sessionManager.switchWindow(sessionId, windowIndex);
  }

  /**
   * 关闭指定窗口
   */
  async closeWindow(sessionId: string, windowIndex: number): Promise<void> {
    return this.sessionManager.closeWindow(sessionId, windowIndex);
  }

  // ==================== P2.1 CDP 连接 ====================

  /**
   * 通过 CDP 连接到已运行的浏览器
   */
  async connectCdp(options: ConnectCdpInput): Promise<CdpSessionInfo> {
    // 建立 CDP 连接
    const connection = await this.cdpConnector.connect({
      wsEndpoint: options.wsEndpoint,
      port: options.port,
      timeout: options.timeout,
    });

    // 创建 BrowserContext
    const context = await this.cdpConnector.createContext(connection);

    // 创建会话
    const session = await this.sessionManager.createCdpSession(
      connection.browser,
      context,
      connection.wsEndpoint,
    );

    return {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      url: session.page.url() || null,
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
    sessionId: string,
    rules: InterceptRule[],
  ): Promise<{ rulesCount: number }> {
    const session = this.sessionManager.getSession(sessionId);
    return this.networkInterceptor.setRules(sessionId, session.page, rules);
  }

  /**
   * 添加单条拦截规则
   */
  async addInterceptRule(
    sessionId: string,
    rule: InterceptRule,
  ): Promise<{ ruleId: string }> {
    const session = this.sessionManager.getSession(sessionId);
    return this.networkInterceptor.addRule(sessionId, session.page, rule);
  }

  /**
   * 移除拦截规则
   */
  removeInterceptRule(sessionId: string, ruleId: string): boolean {
    return this.networkInterceptor.removeRule(sessionId, ruleId);
  }

  /**
   * 清除所有拦截规则
   */
  async clearInterceptRules(sessionId: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    return this.networkInterceptor.clearRules(sessionId, session.page);
  }

  /**
   * 获取当前拦截规则
   */
  getInterceptRules(sessionId: string): InterceptRule[] {
    return this.networkInterceptor.getRules(sessionId);
  }

  /**
   * 获取网络请求历史
   */
  getNetworkHistory(
    sessionId: string,
    options?: { limit?: number; urlFilter?: string },
  ): NetworkRequestRecord[] {
    return this.networkInterceptor.getRequestHistory(sessionId, options);
  }

  /**
   * 清除网络历史记录
   */
  clearNetworkHistory(sessionId: string): void {
    this.networkInterceptor.clearHistory(sessionId);
  }

  // ==================== P2.3 会话持久化 ====================

  /**
   * 导出会话存储
   */
  async exportStorage(
    sessionId: string,
    options?: ExportStorageInput,
  ): Promise<StorageExportResult> {
    const session = this.sessionManager.getSession(sessionId);
    return this.storagePersistence.exportStorage(
      session.context,
      session.page,
      options,
    );
  }

  /**
   * 导入会话存储
   */
  async importStorage(
    sessionId: string,
    data: ImportStorageInput,
  ): Promise<{
    imported: { cookies: number; localStorage: number; sessionStorage: number };
  }> {
    const session = this.sessionManager.getSession(sessionId);
    return this.storagePersistence.importStorage(
      session.context,
      session.page,
      data,
    );
  }

  /**
   * 清除会话存储
   */
  async clearStorage(
    sessionId: string,
    options?: {
      cookies?: boolean;
      localStorage?: boolean;
      sessionStorage?: boolean;
    },
  ): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    return this.storagePersistence.clearStorage(
      session.context,
      session.page,
      options,
    );
  }

  // ==================== P2.4 增量快照 ====================

  /**
   * 获取增量快照（delta 模式）
   */
  async getDeltaSnapshot(
    sessionId: string,
    options?: Partial<DeltaSnapshotInput>,
  ): Promise<DeltaSnapshotResponse> {
    const session = this.sessionManager.getSession(sessionId);

    const { snapshot, refs } = await this.snapshotService.captureDelta(
      sessionId,
      session.page,
      options,
    );

    // 更新会话的 ref 映射
    this.sessionManager.updateRefs(sessionId, refs);

    return snapshot;
  }
}
