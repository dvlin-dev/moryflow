/**
 * Browser Session Manager
 *
 * [INPUT]: 会话创建/管理请求（含上下文配置）
 * [OUTPUT]: BrowserSession 实例
 * [POS]: 管理浏览器会话生命周期，包含 Ref 映射与窗口/标签页状态（含拦截/快照清理）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { BrowserContext, Page, Locator, Dialog } from 'playwright';
import { BrowserPool } from '../browser-pool';
import { NetworkInterceptorService } from '../network';
import { SnapshotService } from '../snapshot';
import type { BrowserContextOptions } from '../browser.types';
import type {
  CreateSessionInput,
  CreateWindowInput,
  RefData,
  WindowInfo,
} from '../dto';

/** 对话框记录 */
export interface DialogRecord {
  /** 对话框类型 */
  type: 'alert' | 'confirm' | 'prompt' | 'beforeunload';
  /** 对话框消息 */
  message: string;
  /** 默认输入值（仅 prompt 类型） */
  defaultValue?: string;
  /** 处理时间 */
  handledAt: Date;
  /** 是否被接受 */
  accepted: boolean;
}

/** 标签页信息 */
export interface TabInfo {
  /** 标签页索引 */
  index: number;
  /** 页面 URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 是否为活跃标签页 */
  active: boolean;
}

/** 窗口数据（独立 BrowserContext） */
export interface WindowData {
  /** Playwright BrowserContext */
  context: BrowserContext;
  /** 当前活跃 Page */
  page: Page;
  /** 所有页面（多标签页支持） */
  pages: Page[];
  /** 当前活跃页面索引 */
  activePageIndex: number;
}

/** 浏览器会话 */
export interface BrowserSession {
  /** 会话 ID */
  id: string;
  /** 会话归属用户（用于权限校验） */
  ownerUserId?: string;
  /** 所有窗口（多窗口支持，每个窗口是独立的 BrowserContext） */
  windows: WindowData[];
  /** 当前活跃窗口索引 */
  activeWindowIndex: number;
  /** Playwright BrowserContext（当前活跃窗口） */
  context: BrowserContext;
  /** 当前活跃 Page */
  page: Page;
  /** 所有页面（当前活跃窗口的多标签页支持） */
  pages: Page[];
  /** 当前活跃页面索引（当前活跃窗口） */
  activePageIndex: number;
  /** 元素引用映射（每次 snapshot 后更新） */
  refs: Map<string, RefData>;
  /** 对话框历史记录（最近 10 条） */
  dialogHistory: DialogRecord[];
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date;
  /** 是否为 CDP 连接（用于区分关闭行为） */
  isCdpConnection?: boolean;
  /** CDP WebSocket 端点（仅 CDP 会话有效） */
  wsEndpoint?: string;
}

/** Session 不存在错误 */
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

/** Session 已过期错误 */
export class SessionExpiredError extends Error {
  constructor(sessionId: string) {
    super(`Session expired: ${sessionId}`);
    this.name = 'SessionExpiredError';
  }
}

/** Session 归属校验失败 */
export class SessionOwnershipError extends Error {
  constructor(sessionId: string) {
    super(`Session ownership mismatch: ${sessionId}`);
    this.name = 'SessionOwnershipError';
  }
}

/** Session 操作不允许 */
export class SessionOperationNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionOperationNotAllowedError';
  }
}

@Injectable()
export class SessionManager implements OnModuleDestroy {
  private readonly logger = new Logger(SessionManager.name);

  /** 活跃会话 */
  private readonly sessions = new Map<string, BrowserSession>();

  /** 清理定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /** 默认超时时间（5 分钟） */
  private readonly DEFAULT_TIMEOUT = 5 * 60 * 1000;

  constructor(
    private readonly browserPool: BrowserPool,
    private readonly networkInterceptor: NetworkInterceptorService,
    private readonly snapshotService: SnapshotService,
  ) {
    this.startCleanupTimer();
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 关闭所有会话
    const closePromises = Array.from(this.sessions.keys()).map((id) =>
      this.closeSession(id).catch((err) =>
        this.logger.warn(`Error closing session ${id}: ${err}`),
      ),
    );
    await Promise.all(closePromises);
  }

  /**
   * 创建新会话
   */
  async createSession(
    options?: Partial<CreateSessionInput>,
    ownerUserId?: string,
  ): Promise<BrowserSession> {
    const sessionId = this.generateSessionId();
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;

    // 从浏览器池获取上下文
    const context = await this.browserPool.acquireContext(
      this.toContextOptions(options),
    );

    // 创建页面
    const page = await context.newPage();

    // 应用会话配置（viewport 需要在 page 创建后设置）
    if (options?.viewport) {
      await page.setViewportSize(options.viewport);
    }

    // 设置默认超时
    page.setDefaultTimeout(30000);

    // 创建初始窗口数据
    const initialWindow: WindowData = {
      context,
      page,
      pages: [page],
      activePageIndex: 0,
    };

    const now = new Date();
    const session: BrowserSession = {
      id: sessionId,
      ownerUserId,
      // 多窗口支持
      windows: [initialWindow],
      activeWindowIndex: 0,
      // 当前活跃窗口的快捷引用（向后兼容）
      context,
      page,
      pages: [page],
      activePageIndex: 0,
      refs: new Map(),
      dialogHistory: [],
      createdAt: now,
      expiresAt: new Date(now.getTime() + timeout),
      lastAccessedAt: now,
    };

    // 设置对话框自动处理
    this.setupDialogHandler(session, page);

    this.sessions.set(sessionId, session);
    this.logger.debug(
      `Session created: ${sessionId}, expires at ${session.expiresAt.toISOString()}`,
    );

    return session;
  }

  /**
   * 设置页面的对话框处理器
   */
  private setupDialogHandler(session: BrowserSession, page: Page): void {
    page.on('dialog', async (dialog: Dialog) => {
      const dialogType = dialog.type() as DialogRecord['type'];
      const message = dialog.message();
      const defaultValue = dialog.defaultValue();

      this.logger.debug(
        `Dialog appeared in session ${session.id}: [${dialogType}] ${message}`,
      );

      // 记录对话框信息
      const record: DialogRecord = {
        type: dialogType,
        message,
        defaultValue: defaultValue || undefined,
        handledAt: new Date(),
        accepted: true,
      };

      // 保留最近 10 条记录
      session.dialogHistory.push(record);
      if (session.dialogHistory.length > 10) {
        session.dialogHistory.shift();
      }

      // 自动接受对话框
      try {
        await dialog.accept();
      } catch (error) {
        this.logger.warn(`Failed to accept dialog: ${error}`);
      }
    });
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): BrowserSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    // 检查是否过期
    if (new Date() > session.expiresAt) {
      // 异步清理过期会话
      this.closeSession(sessionId).catch((err) =>
        this.logger.warn(`Error closing expired session: ${err}`),
      );
      throw new SessionExpiredError(sessionId);
    }

    // 更新最后访问时间
    session.lastAccessedAt = new Date();

    return session;
  }

  /**
   * 校验会话归属
   */
  assertSessionOwnership(
    sessionId: string,
    ownerUserId: string,
  ): BrowserSession {
    const session = this.getSession(sessionId);

    if (session.ownerUserId && session.ownerUserId !== ownerUserId) {
      throw new SessionOwnershipError(sessionId);
    }

    return session;
  }

  /**
   * 延长会话有效期
   */
  extendSession(sessionId: string, additionalMs: number): void {
    const session = this.getSession(sessionId);
    session.expiresAt = new Date(session.expiresAt.getTime() + additionalMs);
    this.logger.debug(
      `Session ${sessionId} extended to ${session.expiresAt.toISOString()}`,
    );
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    this.sessions.delete(sessionId);

    // CDP 连接只断开连接，不关闭外部浏览器
    if (session.isCdpConnection) {
      for (const window of session.windows) {
        try {
          // 只关闭 Playwright 的连接，不关闭外部浏览器
          const browser = window.context.browser();
          if (browser) {
            await browser.close();
          }
        } catch (error) {
          this.logger.warn(
            `Error disconnecting CDP session ${sessionId}: ${error}`,
          );
        }
      }
      this.logger.debug(`CDP session disconnected: ${sessionId}`);
      await this.cleanupSessionResources(sessionId);
      return;
    }

    // 普通会话：释放所有窗口的上下文
    const releasePromises = session.windows.map(async (window) => {
      try {
        await this.browserPool.releaseContext(window.context);
      } catch (error) {
        this.logger.warn(
          `Error releasing context for session ${sessionId}: ${error}`,
        );
      }
    });

    await Promise.all(releasePromises);
    await this.cleanupSessionResources(sessionId);
    this.logger.debug(
      `Session closed: ${sessionId}, released ${session.windows.length} window(s)`,
    );
  }

  /**
   * 创建 CDP 会话
   */
  async createCdpSession(
    context: BrowserContext,
    wsEndpoint: string,
    options?: Partial<CreateSessionInput>,
    ownerUserId?: string,
  ): Promise<BrowserSession> {
    const sessionId = this.generateSessionId();
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;

    // 获取现有页面或创建新页面
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    // 应用会话配置
    if (options?.viewport) {
      await page.setViewportSize(options.viewport);
    }

    page.setDefaultTimeout(30000);

    // 创建初始窗口数据
    const initialWindow: WindowData = {
      context,
      page,
      pages: pages.length > 0 ? pages : [page],
      activePageIndex: 0,
    };

    const now = new Date();
    const session: BrowserSession = {
      id: sessionId,
      ownerUserId,
      windows: [initialWindow],
      activeWindowIndex: 0,
      context,
      page,
      pages: initialWindow.pages,
      activePageIndex: 0,
      refs: new Map(),
      dialogHistory: [],
      createdAt: now,
      expiresAt: new Date(now.getTime() + timeout),
      lastAccessedAt: now,
      isCdpConnection: true,
      wsEndpoint,
    };

    // 设置对话框自动处理
    this.setupDialogHandler(session, page);

    this.sessions.set(sessionId, session);
    this.logger.debug(
      `CDP session created: ${sessionId}, wsEndpoint: ${wsEndpoint}`,
    );

    return session;
  }

  /**
   * 获取会话信息
   */
  getSessionInfo(sessionId: string): {
    id: string;
    createdAt: string;
    expiresAt: string;
    url: string | null;
    title: string | null;
  } {
    const session = this.getSession(sessionId);

    return {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      url: session.page.url() || null,
      title: null, // 标题需要异步获取，这里返回 null
    };
  }

  /**
   * 更新会话的 ref 映射
   */
  updateRefs(sessionId: string, refs: Map<string, RefData>): void {
    const session = this.getSession(sessionId);
    session.refs = refs;
  }

  /**
   * 解析选择器（支持 @ref 格式）
   */
  resolveSelector(session: BrowserSession, selector: string): Locator {
    // @ref 格式：@e1, @e2, ...
    if (selector.startsWith('@')) {
      const refKey = selector.slice(1);
      const refData = session.refs.get(refKey);

      if (!refData) {
        throw new Error(
          `Unknown ref: ${selector}. Run 'snapshot' to get updated refs.`,
        );
      }

      // 使用语义定位器
      let locator = session.page.getByRole(
        refData.role as Parameters<Page['getByRole']>[0],
        {
          name: refData.name,
          exact: true,
        },
      );

      // 如果有 nth 索引，应用它
      if (refData.nth !== undefined) {
        locator = locator.nth(refData.nth);
      }

      return locator;
    }

    // 普通 CSS 选择器
    return session.page.locator(selector);
  }

  // ==================== 多标签页管理 ====================

  /**
   * 创建新标签页（在当前活跃窗口内）
   */
  async createTab(sessionId: string): Promise<TabInfo> {
    const session = this.getSession(sessionId);
    const activeWindow = session.windows[session.activeWindowIndex];

    const newPage = await activeWindow.context.newPage();
    newPage.setDefaultTimeout(30000);

    // 设置对话框处理
    this.setupDialogHandler(session, newPage);

    const newIndex = activeWindow.pages.length;
    activeWindow.pages.push(newPage);

    // 切换到新标签页
    activeWindow.activePageIndex = newIndex;
    activeWindow.page = newPage;

    // 同步到会话
    this.syncWindowToSession(session);

    // 清除 refs（新页面没有元素）
    session.refs = new Map();

    this.logger.debug(
      `New tab created in session ${sessionId}, window ${session.activeWindowIndex}, index: ${newIndex}`,
    );

    return {
      index: newIndex,
      url: newPage.url(),
      title: '',
      active: true,
    };
  }

  /**
   * 列出所有标签页（当前活跃窗口内）
   */
  async listTabs(sessionId: string): Promise<TabInfo[]> {
    const session = this.getSession(sessionId);
    const activeWindow = session.windows[session.activeWindowIndex];

    const tabs: TabInfo[] = [];
    for (let i = 0; i < activeWindow.pages.length; i++) {
      const page = activeWindow.pages[i];
      // 检查页面是否已关闭
      if (page.isClosed()) {
        continue;
      }

      let title = '';
      try {
        title = await page.title();
      } catch {
        // 页面可能正在加载，忽略错误
      }

      tabs.push({
        index: i,
        url: page.url(),
        title,
        active: i === activeWindow.activePageIndex,
      });
    }

    return tabs;
  }

  /**
   * 切换到指定标签页（在当前活跃窗口内）
   */
  async switchTab(sessionId: string, tabIndex: number): Promise<TabInfo> {
    const session = this.getSession(sessionId);
    const activeWindow = session.windows[session.activeWindowIndex];

    if (tabIndex < 0 || tabIndex >= activeWindow.pages.length) {
      throw new Error(
        `Invalid tab index: ${tabIndex}. Valid range: 0-${activeWindow.pages.length - 1}`,
      );
    }

    const targetPage = activeWindow.pages[tabIndex];

    if (targetPage.isClosed()) {
      throw new Error(`Tab ${tabIndex} has been closed`);
    }

    // 更新活跃页面
    activeWindow.activePageIndex = tabIndex;
    activeWindow.page = targetPage;

    // 同步到会话
    this.syncWindowToSession(session);

    // 清除 refs（需要重新获取快照）
    session.refs = new Map();

    // 将页面带到前台
    await targetPage.bringToFront();

    let title = '';
    try {
      title = await targetPage.title();
    } catch {
      // 忽略
    }

    this.logger.debug(`Switched to tab ${tabIndex} in session ${sessionId}`);

    return {
      index: tabIndex,
      url: targetPage.url(),
      title,
      active: true,
    };
  }

  /**
   * 关闭指定标签页（在当前活跃窗口内）
   */
  async closeTab(sessionId: string, tabIndex: number): Promise<void> {
    const session = this.getSession(sessionId);
    const activeWindow = session.windows[session.activeWindowIndex];

    if (tabIndex < 0 || tabIndex >= activeWindow.pages.length) {
      throw new Error(
        `Invalid tab index: ${tabIndex}. Valid range: 0-${activeWindow.pages.length - 1}`,
      );
    }

    // 不能关闭最后一个标签页
    const openTabs = activeWindow.pages.filter((p) => !p.isClosed());
    if (openTabs.length <= 1) {
      throw new Error('Cannot close the last tab. Close the window instead.');
    }

    const targetPage = activeWindow.pages[tabIndex];

    if (!targetPage.isClosed()) {
      await targetPage.close();
    }

    // 如果关闭的是当前活跃标签页，切换到另一个
    if (tabIndex === activeWindow.activePageIndex) {
      // 找到下一个未关闭的标签页
      let newActiveIndex = -1;
      for (let i = 0; i < activeWindow.pages.length; i++) {
        if (!activeWindow.pages[i].isClosed()) {
          newActiveIndex = i;
          break;
        }
      }

      if (newActiveIndex >= 0) {
        activeWindow.activePageIndex = newActiveIndex;
        activeWindow.page = activeWindow.pages[newActiveIndex];
        // 同步到会话
        this.syncWindowToSession(session);
        session.refs = new Map();
      }
    }

    this.logger.debug(`Closed tab ${tabIndex} in session ${sessionId}`);
  }

  /**
   * 获取对话框历史记录
   */
  getDialogHistory(sessionId: string): DialogRecord[] {
    const session = this.getSession(sessionId);
    return [...session.dialogHistory];
  }

  // ==================== 多窗口管理 ====================

  /**
   * 创建新窗口（独立 BrowserContext，隔离 cookies/storage）
   */
  async createWindow(
    sessionId: string,
    options?: CreateWindowInput,
  ): Promise<WindowInfo> {
    const session = this.getSession(sessionId);

    if (session.isCdpConnection) {
      throw new SessionOperationNotAllowedError(
        'Creating a new window is not supported for CDP sessions.',
      );
    }

    // 从浏览器池获取新的上下文
    const newContext = await this.browserPool.acquireContext(
      this.toWindowContextOptions(options),
    );

    // 创建页面
    const newPage = await newContext.newPage();

    // 应用视口配置（若已在 context 设置则保持一致）
    if (options?.viewport) {
      await newPage.setViewportSize(options.viewport);
    }

    newPage.setDefaultTimeout(30000);

    // 创建窗口数据
    const windowData: WindowData = {
      context: newContext,
      page: newPage,
      pages: [newPage],
      activePageIndex: 0,
    };

    const newIndex = session.windows.length;
    session.windows.push(windowData);

    // 切换到新窗口
    session.activeWindowIndex = newIndex;
    session.context = newContext;
    session.page = newPage;
    session.pages = [newPage];
    session.activePageIndex = 0;

    // 清除 refs（新窗口没有元素）
    session.refs = new Map();

    // 设置对话框处理
    this.setupDialogHandler(session, newPage);

    this.logger.debug(
      `New window created in session ${sessionId}, index: ${newIndex}`,
    );

    return {
      index: newIndex,
      url: newPage.url(),
      title: '',
      active: true,
      tabCount: 1,
    };
  }

  /**
   * CreateSessionInput -> BrowserContextOptions
   */
  private toContextOptions(
    options?: Partial<CreateSessionInput>,
  ): BrowserContextOptions | undefined {
    if (!options) return undefined;

    return {
      viewport: options.viewport,
      userAgent: options.userAgent,
      javaScriptEnabled: options.javaScriptEnabled,
      ignoreHTTPSErrors: options.ignoreHTTPSErrors,
    };
  }

  /**
   * CreateWindowInput -> BrowserContextOptions
   */
  private toWindowContextOptions(
    options?: CreateWindowInput,
  ): BrowserContextOptions | undefined {
    if (!options) return undefined;

    return {
      viewport: options.viewport,
      userAgent: options.userAgent,
    };
  }

  /**
   * 列出所有窗口
   */
  async listWindows(sessionId: string): Promise<WindowInfo[]> {
    const session = this.getSession(sessionId);

    const windows: WindowInfo[] = [];
    for (let i = 0; i < session.windows.length; i++) {
      const window = session.windows[i];
      const activePage = window.page;

      // 检查窗口是否有效（至少有一个未关闭的页面）
      const openPages = window.pages.filter((p) => !p.isClosed());
      if (openPages.length === 0) {
        continue;
      }

      let title = '';
      try {
        title = await activePage.title();
      } catch {
        // 页面可能正在加载，忽略错误
      }

      windows.push({
        index: i,
        url: activePage.url(),
        title,
        active: i === session.activeWindowIndex,
        tabCount: openPages.length,
      });
    }

    return windows;
  }

  /**
   * 切换到指定窗口
   */
  async switchWindow(
    sessionId: string,
    windowIndex: number,
  ): Promise<WindowInfo> {
    const session = this.getSession(sessionId);

    if (windowIndex < 0 || windowIndex >= session.windows.length) {
      throw new Error(
        `Invalid window index: ${windowIndex}. Valid range: 0-${session.windows.length - 1}`,
      );
    }

    const targetWindow = session.windows[windowIndex];

    // 检查窗口是否有效
    const openPages = targetWindow.pages.filter((p) => !p.isClosed());
    if (openPages.length === 0) {
      throw new Error(`Window ${windowIndex} has no open pages`);
    }

    // 更新活跃窗口
    session.activeWindowIndex = windowIndex;
    session.context = targetWindow.context;
    session.page = targetWindow.page;
    session.pages = targetWindow.pages;
    session.activePageIndex = targetWindow.activePageIndex;

    // 清除 refs（需要重新获取快照）
    session.refs = new Map();

    // 将页面带到前台
    await targetWindow.page.bringToFront();

    let title = '';
    try {
      title = await targetWindow.page.title();
    } catch {
      // 忽略
    }

    this.logger.debug(
      `Switched to window ${windowIndex} in session ${sessionId}`,
    );

    return {
      index: windowIndex,
      url: targetWindow.page.url(),
      title,
      active: true,
      tabCount: openPages.length,
    };
  }

  /**
   * 关闭指定窗口
   */
  async closeWindow(sessionId: string, windowIndex: number): Promise<void> {
    const session = this.getSession(sessionId);

    if (windowIndex < 0 || windowIndex >= session.windows.length) {
      throw new Error(
        `Invalid window index: ${windowIndex}. Valid range: 0-${session.windows.length - 1}`,
      );
    }

    // 不能关闭最后一个窗口
    const openWindows = session.windows.filter((w) =>
      w.pages.some((p) => !p.isClosed()),
    );
    if (openWindows.length <= 1) {
      throw new Error(
        'Cannot close the last window. Close the session instead.',
      );
    }

    const targetWindow = session.windows[windowIndex];

    // 释放上下文
    try {
      await this.browserPool.releaseContext(targetWindow.context);
    } catch (error) {
      this.logger.warn(`Error releasing window context: ${error}`);
    }

    // 如果关闭的是当前活跃窗口，切换到另一个
    if (windowIndex === session.activeWindowIndex) {
      // 找到下一个有效窗口
      let newActiveIndex = -1;
      for (let i = 0; i < session.windows.length; i++) {
        if (
          i !== windowIndex &&
          session.windows[i].pages.some((p) => !p.isClosed())
        ) {
          newActiveIndex = i;
          break;
        }
      }

      if (newActiveIndex >= 0) {
        const newWindow = session.windows[newActiveIndex];
        session.activeWindowIndex = newActiveIndex;
        session.context = newWindow.context;
        session.page = newWindow.page;
        session.pages = newWindow.pages;
        session.activePageIndex = newWindow.activePageIndex;
        session.refs = new Map();
      }
    }

    // 标记窗口为无效（关闭所有页面）
    for (const page of targetWindow.pages) {
      if (!page.isClosed()) {
        try {
          await page.close();
        } catch {
          // 忽略关闭错误
        }
      }
    }

    this.logger.debug(`Closed window ${windowIndex} in session ${sessionId}`);
  }

  /**
   * 同步当前窗口状态到会话
   * 在标签页操作后调用，确保会话的快捷引用与当前窗口同步
   */
  private syncWindowToSession(session: BrowserSession): void {
    const activeWindow = session.windows[session.activeWindowIndex];
    session.context = activeWindow.context;
    session.page = activeWindow.page;
    session.pages = activeWindow.pages;
    session.activePageIndex = activeWindow.activePageIndex;
  }

  /**
   * 获取所有活跃会话数量
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `bs_${timestamp}_${random}`;
  }

  /**
   * 启动定期清理
   */
  private startCleanupTimer(): void {
    // 每 30 秒检查一次
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions().catch((error) => {
        this.logger.error('Error during session cleanup', error);
      });
    }, 30 * 1000);
  }

  /**
   * 清理过期会话
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredIds: string[] = [];

    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        expiredIds.push(id);
      }
    }

    if (expiredIds.length > 0) {
      this.logger.debug(`Cleaning up ${expiredIds.length} expired session(s)`);

      for (const id of expiredIds) {
        await this.closeSession(id).catch((err) =>
          this.logger.warn(`Error closing expired session ${id}: ${err}`),
        );
      }
    }
  }

  private async cleanupSessionResources(sessionId: string): Promise<void> {
    try {
      await this.networkInterceptor.cleanupSession(sessionId);
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup network interceptor for session ${sessionId}: ${error}`,
      );
    }

    this.snapshotService.clearCache(sessionId);
  }
}
