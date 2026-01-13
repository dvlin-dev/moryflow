/**
 * Browser Session Manager
 *
 * [INPUT]: 会话创建/管理请求
 * [OUTPUT]: BrowserSession 实例
 * [POS]: 管理浏览器会话生命周期，包含 Ref 映射
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { BrowserContext, Page, Locator } from 'playwright';
import { BrowserPool } from '../browser-pool';
import type { CreateSessionInput, RefData } from '../dto';

/** 浏览器会话 */
export interface BrowserSession {
  /** 会话 ID */
  id: string;
  /** Playwright BrowserContext */
  context: BrowserContext;
  /** 当前活跃 Page */
  page: Page;
  /** 元素引用映射（每次 snapshot 后更新） */
  refs: Map<string, RefData>;
  /** 创建时间 */
  createdAt: Date;
  /** 过期时间 */
  expiresAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date;
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

@Injectable()
export class SessionManager implements OnModuleDestroy {
  private readonly logger = new Logger(SessionManager.name);

  /** 活跃会话 */
  private readonly sessions = new Map<string, BrowserSession>();

  /** 清理定时器 */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /** 默认超时时间（5 分钟） */
  private readonly DEFAULT_TIMEOUT = 5 * 60 * 1000;

  constructor(private readonly browserPool: BrowserPool) {
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
  ): Promise<BrowserSession> {
    const sessionId = this.generateSessionId();
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;

    // 从浏览器池获取上下文
    const context = await this.browserPool.acquireContext();

    // 创建页面
    const page = await context.newPage();

    // 应用会话配置（viewport 需要在 page 创建后设置）
    if (options?.viewport) {
      await page.setViewportSize(options.viewport);
    }

    // 设置默认超时
    page.setDefaultTimeout(30000);

    const now = new Date();
    const session: BrowserSession = {
      id: sessionId,
      context,
      page,
      refs: new Map(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + timeout),
      lastAccessedAt: now,
    };

    this.sessions.set(sessionId, session);
    this.logger.debug(
      `Session created: ${sessionId}, expires at ${session.expiresAt.toISOString()}`,
    );

    return session;
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

    try {
      // 释放浏览器上下文回池
      await this.browserPool.releaseContext(session.context);
      this.logger.debug(`Session closed: ${sessionId}`);
    } catch (error) {
      this.logger.warn(
        `Error releasing context for session ${sessionId}: ${error}`,
      );
    }
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
}
