/**
 * Browser Session Service
 *
 * [INPUT]: 会话操作请求
 * [OUTPUT]: 会话信息、快照、操作结果
 * [POS]: L2 Browser API 业务逻辑层，整合 SessionManager、SnapshotService、ActionHandler
 */

import { Injectable, Logger } from '@nestjs/common';
import { UrlValidator } from '../common';
import { SessionManager, type BrowserSession } from './session';
import { SnapshotService } from './snapshot';
import { ActionHandler } from './handlers';
import type {
  CreateSessionInput,
  OpenUrlInput,
  SnapshotInput,
  ActionInput,
  ScreenshotInput,
  SessionInfo,
  SnapshotResponse,
  ActionResponse,
  ScreenshotResponse,
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
      const locator = this.resolveSelector(session, selector);
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

  /**
   * 解析选择器（支持 @ref）
   */
  private resolveSelector(session: BrowserSession, selector: string) {
    return this.sessionManager.resolveSelector(session, selector);
  }
}
